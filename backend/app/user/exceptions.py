class UserServiceError(Exception):
    """Base exception for user service"""
    def __init__(self, message: str, code: int = 500):
        self.message = message
        self.code = code
        super().__init__(message)


class UserAlreadyExistsError(UserServiceError):
    """Raised when a user with email or phone already exists"""
    def __init__(self, message: str = "User already exists"):
        super().__init__(message, code=409)


class DatabaseError(UserServiceError):
    """Raised when database operation fails"""
    def __init__(self, message: str = "Database error"):
        super().__init__(message, code=500)