class UserServiceError(Exception):
    """Base class for all user service related exceptions."""
    def __init__(self, message: str, code: int = 400):
        self.message = message
        self.code = code
        super().__init__(message)


class UserAlreadyExistsError(UserServiceError):
    """Raised when trying to create a user with an existing email or phone."""
    def __init__(self, message: str = "User with this email or phone already exists"):
        super().__init__(message, code=409)


class UserNotFoundError(UserServiceError):
    """Raised when a user is not found in the database."""
    def __init__(self, message: str = "User not found"):
        super().__init__(message, code=404)


class DatabaseError(UserServiceError):
    """Raised when a database operation fails."""
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, code=500)