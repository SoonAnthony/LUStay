class UserServiceError(Exception):
    """Base exception for all user service errors."""
    def __init__(self, message: str, code: int = 400):
        super().__init__(message)
        self.code = code


class UserAlreadyExistsError(UserServiceError):
    """Raised when trying to create a user that already exists."""
    def __init__(self, message: str = "User already exists"):
        super().__init__(message, code=409)


class DatabaseError(UserServiceError):
    """Raised for general database errors."""
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(message, code=500)


class UserNotFoundError(UserServiceError):
    """Raised when a user cannot be found."""
    def __init__(self, user_id: str):
        message = f"User with id '{user_id}' not found"
        super().__init__(message, code=404)