import authService from '../auth/authService';

/**
 * Service export pointing to the isolated authService.
 * Keeps services/ directory standard compliant while maintaining isolated auth logic.
 */
export { authService, MOCK_USERS } from '../auth/authService';
export default authService;
