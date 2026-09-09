import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    avatar = Column(Text, nullable=True)
    role = Column(String(50), default='admin', nullable=False)
    auth_provider = Column(String(50), default='email', nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name or (self.email.split("@")[0] if self.email else "User"),
            "role": self.role,
            "avatar": self.avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
            "google_id": self.google_id,
            "auth_provider": self.auth_provider,
            "email_verified": self.email_verified,
            "permissions": ["*"]
        }
