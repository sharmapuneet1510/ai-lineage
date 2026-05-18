class LineageException(Exception):
    pass


class AccessDeniedException(LineageException):
    def __init__(self, message: str = "Access denied"):
        self.message = message
        super().__init__(self.message)


class NotFoundException(LineageException):
    def __init__(self, resource: str, identifier: str):
        self.message = f"{resource} not found: {identifier}"
        super().__init__(self.message)


class ValidationException(LineageException):
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)
