import uuid
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectPlot, PlotBooking
from app.schemas.project import PlotBookingCreate, PlotBookingUpdate, PlotUpdate

logger = logging.getLogger(__name__)


class PlotInventoryService:
    """Plot Inventory & Booking Management Service (`project_plots` & `plot_bookings` SQLite/PostgreSQL tables)."""

    def get_project_plots(self, db: Session, project_id: str) -> List[Dict[str, Any]]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project '{project_id}' not found.")
        plots = db.query(ProjectPlot).filter(ProjectPlot.project_id == project_id).order_by(ProjectPlot.plot_number.asc()).all()
        return [self._format_plot_response(p) for p in plots]

    def get_plot_by_id(self, db: Session, project_id: str, plot_id: str) -> Dict[str, Any]:
        plot = db.query(ProjectPlot).filter(
            ProjectPlot.project_id == project_id,
            (ProjectPlot.id == plot_id) | (ProjectPlot.plot_number == plot_id)
        ).first()
        if not plot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plot '{plot_id}' not found in project '{project_id}'.")
        return self._format_plot_response(plot)

    def book_plot(self, db: Session, project_id: str, plot_id: str, payload: PlotBookingCreate) -> Dict[str, Any]:
        """
        Atomically book an available plot, record customer & payment details,
        and mark plot status as BOOKED. Rejects duplicate bookings.
        """
        plot = db.query(ProjectPlot).filter(
            ProjectPlot.project_id == project_id,
            (ProjectPlot.id == plot_id) | (ProjectPlot.plot_number == plot_id)
        ).first()
        if not plot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plot '{plot_id}' not found.")

        # Duplicate Booking Protection
        if plot.status and plot.status.upper() == "BOOKED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Plot '{plot.plot_number}' is already BOOKED. Duplicate bookings are not allowed."
            )

        if not payload.customerName or not payload.customerName.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer Name is required.")
        if not payload.customerPhone or not payload.customerPhone.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer Phone Number is required.")
        if payload.bookingAmount is None or payload.bookingAmount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking amount must be greater than 0.")

        # Total amount resolution: prefer plot base_price, fallback to payload totalAmount
        total_amount = float(plot.base_price) if (plot.base_price and float(plot.base_price) > 0) else float(payload.totalAmount or 1000000.0)
        booking_amount = float(payload.bookingAmount)
        paid_amount = float(payload.paidAmount) if payload.paidAmount is not None else booking_amount
        remaining_amount = max(0.0, total_amount - paid_amount)

        # Parse booking date
        booking_date = datetime.utcnow()
        if payload.bookingDate:
            try:
                booking_date = datetime.fromisoformat(payload.bookingDate.replace('Z', '+00:00'))
            except Exception:
                booking_date = datetime.utcnow()

        payment_status = (payload.paymentStatus or ("PAID" if remaining_amount <= 0 else "PARTIAL")).upper().strip()

        booking = PlotBooking(
            id=str(uuid.uuid4()),
            project_id=project_id,
            plot_id=plot.id,
            customer_name=payload.customerName.strip(),
            customer_phone=payload.customerPhone.strip(),
            customer_email=payload.customerEmail.strip() if payload.customerEmail else None,
            customer_address=payload.customerAddress.strip() if payload.customerAddress else None,
            booking_date=booking_date,
            total_amount=total_amount,
            booking_amount=booking_amount,
            paid_amount=paid_amount,
            remaining_amount=remaining_amount,
            payment_status=payment_status,
            payment_method=(payload.paymentMethod or "UPI").strip(),
            transaction_id=payload.transactionId.strip() if payload.transactionId else None,
            notes=payload.notes.strip() if payload.notes else None,
            booking_status="BOOKED"
        )

        plot.status = "BOOKED"
        plot.customer_id = booking.id
        plot.reservation_date = booking_date
        plot.updated_at = datetime.utcnow()

        db.add(booking)
        db.commit()
        db.refresh(plot)
        db.refresh(booking)

        logger.info(f"Plot '{plot.plot_number}' successfully booked for customer '{booking.customer_name}' with booking ID '{booking.id}'.")
        return self._format_plot_response(plot)

    def update_booking(self, db: Session, project_id: str, booking_id: str, payload: PlotBookingUpdate) -> Dict[str, Any]:
        """Update customer, payment, or notes on an existing booking."""
        booking = db.query(PlotBooking).filter(
            PlotBooking.id == booking_id,
            PlotBooking.project_id == project_id
        ).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Booking '{booking_id}' not found.")

        if payload.customerName is not None and payload.customerName.strip():
            booking.customer_name = payload.customerName.strip()
        if payload.customerPhone is not None and payload.customerPhone.strip():
            booking.customer_phone = payload.customerPhone.strip()
        if payload.customerEmail is not None:
            booking.customer_email = payload.customerEmail.strip() if payload.customerEmail.strip() else None
        if payload.customerAddress is not None:
            booking.customer_address = payload.customerAddress.strip() if payload.customerAddress.strip() else None

        if payload.bookingDate is not None and payload.bookingDate.strip():
            try:
                booking.booking_date = datetime.fromisoformat(payload.bookingDate.replace('Z', '+00:00'))
            except Exception:
                pass

        if payload.paidAmount is not None:
            booking.paid_amount = max(0.0, float(payload.paidAmount))
        elif payload.bookingAmount is not None:
            booking.booking_amount = max(0.0, float(payload.bookingAmount))
            booking.paid_amount = max(0.0, float(payload.bookingAmount))

        # Recalculate remaining amount safely
        booking.remaining_amount = max(0.0, float(booking.total_amount) - float(booking.paid_amount))

        if payload.paymentStatus is not None and payload.paymentStatus.strip():
            booking.payment_status = payload.paymentStatus.upper().strip()
        if payload.paymentMethod is not None and payload.paymentMethod.strip():
            booking.payment_method = payload.paymentMethod.strip()
        if payload.transactionId is not None:
            booking.transaction_id = payload.transactionId.strip() if payload.transactionId.strip() else None
        if payload.notes is not None:
            booking.notes = payload.notes.strip() if payload.notes.strip() else None
        if payload.bookingStatus is not None and payload.bookingStatus.strip():
            booking.booking_status = payload.bookingStatus.upper().strip()

        booking.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(booking)

        # Return updated plot response
        plot = db.query(ProjectPlot).filter(ProjectPlot.id == booking.plot_id).first()
        if plot:
            return self._format_plot_response(plot)
        return self._format_booking_response(booking)

    def cancel_booking(self, db: Session, project_id: str, booking_id: str) -> Dict[str, Any]:
        """
        Cancel a booking. Restores plot status to AVAILABLE and changes map color to GREEN.
        Preserves the booking record as CANCELLED in database for audit history.
        """
        booking = db.query(PlotBooking).filter(
            PlotBooking.id == booking_id,
            PlotBooking.project_id == project_id
        ).first()
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Booking '{booking_id}' not found.")

        booking.booking_status = "CANCELLED"
        booking.updated_at = datetime.utcnow()

        plot = db.query(ProjectPlot).filter(ProjectPlot.id == booking.plot_id).first()
        if plot:
            plot.status = "AVAILABLE"
            plot.customer_id = None
            plot.reservation_date = None
            plot.updated_at = datetime.utcnow()

        db.commit()
        if plot:
            db.refresh(plot)
            logger.info(f"Booking '{booking_id}' cancelled. Plot '{plot.plot_number}' is now AVAILABLE.")
            return self._format_plot_response(plot)

        return self._format_booking_response(booking)

    def get_project_bookings(self, db: Session, project_id: str) -> List[Dict[str, Any]]:
        """List all bookings for a project with customer and plot details."""
        bookings = db.query(PlotBooking).filter(
            PlotBooking.project_id == project_id
        ).order_by(PlotBooking.booking_date.desc()).all()

        results = []
        for b in bookings:
            plot_no = b.plot.plot_number if b.plot else None
            results.append(self._format_booking_response(b, plot_number=plot_no))
        return results

    def update_project_plot(self, db: Session, project_id: str, plot_id: str, payload: Any) -> Dict[str, Any]:
        plot = db.query(ProjectPlot).filter(
            ProjectPlot.project_id == project_id,
            (ProjectPlot.id == plot_id) | (ProjectPlot.plot_number == plot_id)
        ).first()
        if not plot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plot '{plot_id}' not found.")

        VALID_STATUSES = {"AVAILABLE", "RESERVED", "SOLD", "BLOCKED", "BOOKED"}
        if getattr(payload, 'status', None) is not None:
            new_status = payload.status.upper().strip()
            if new_status not in VALID_STATUSES:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}.")
            plot.status = new_status

        if getattr(payload, 'notes', None) is not None: plot.notes = payload.notes
        if getattr(payload, 'customerId', None) is not None: plot.customer_id = payload.customerId if payload.customerId.strip() != "" else None
        if getattr(payload, 'basePrice', None) is not None: plot.base_price = payload.basePrice

        if getattr(payload, 'reservationDate', None) is not None:
            if payload.reservationDate.strip() == "": plot.reservation_date = None
            else:
                try: plot.reservation_date = datetime.fromisoformat(payload.reservationDate.replace('Z', '+00:00'))
                except Exception: plot.reservation_date = datetime.utcnow()

        plot.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(plot)
        return self._format_plot_response(plot)

    def _format_booking_response(self, b: PlotBooking, plot_number: Optional[str] = None) -> Dict[str, Any]:
        return {
            "id": b.id,
            "projectId": b.project_id,
            "plotId": b.plot_id,
            "plotNumber": plot_number or (b.plot.plot_number if b.plot else None),
            "customerName": b.customer_name,
            "customerPhone": b.customer_phone,
            "customerEmail": b.customer_email,
            "customerAddress": b.customer_address,
            "bookingDate": b.booking_date.isoformat() if b.booking_date else datetime.utcnow().isoformat(),
            "totalAmount": float(b.total_amount),
            "bookingAmount": float(b.booking_amount),
            "paidAmount": float(b.paid_amount),
            "remainingAmount": float(b.remaining_amount),
            "paymentStatus": b.payment_status,
            "paymentMethod": b.payment_method,
            "transactionId": b.transaction_id,
            "notes": b.notes,
            "bookingStatus": b.booking_status,
            "createdAt": b.created_at.isoformat() if b.created_at else None,
            "updatedAt": b.updated_at.isoformat() if b.updated_at else None,
        }

    def _format_plot_response(self, p: ProjectPlot) -> Dict[str, Any]:
        dim_str = None
        road_name = None
        is_corner = False

        if p.polygon_geojson:
            try:
                geo = json.loads(p.polygon_geojson) if isinstance(p.polygon_geojson, str) else p.polygon_geojson
                props = geo.get("properties", {})
                dim_str = props.get("dimensions")
                is_corner = bool(props.get("isCorner", False))
                road_name = props.get("roadName")
            except Exception:
                pass

        if not dim_str and p.notes:
            parts = p.notes.split(",")
            dim_str = parts[0].strip()
            if len(parts) > 1 and not road_name:
                road_name = parts[1].strip()

        # Find active booking (most recent BOOKED status)
        active_booking = None
        if p.bookings:
            for b in p.bookings:
                if b.booking_status == "BOOKED":
                    active_booking = b
                    break

        return {
            "id": p.id,
            "projectId": p.project_id,
            "layoutSourceId": p.layout_source_id,
            "plotNumber": p.plot_number,
            "polygonGeojson": p.polygon_geojson,
            "calculatedAreaSqFt": float(p.calculated_area_sqft) if p.calculated_area_sqft is not None else None,
            "facingDirection": p.facing_direction or "NORTH",
            "centroidX": float(p.centroid_x) if p.centroid_x is not None else None,
            "centroidY": float(p.centroid_y) if p.centroid_y is not None else None,
            "status": p.status,
            "basePrice": float(p.base_price) if p.base_price is not None else None,
            "notes": p.notes,
            "customerId": p.customer_id,
            "reservationDate": p.reservation_date.isoformat() if p.reservation_date else None,
            "updatedAt": p.updated_at.isoformat() if p.updated_at else None,
            "dimensions": dim_str or "30 × 47 FT",
            "roadName": road_name or "Main Avenue",
            "isCorner": is_corner,
            "activeBooking": self._format_booking_response(active_booking, p.plot_number) if active_booking else None
        }


plot_inventory_service_instance = PlotInventoryService()

