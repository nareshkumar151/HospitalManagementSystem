namespace HMS.Application.Common.Exceptions;

/// <summary> Maps to HTTP 404 in the API's global exception middleware. </summary>
public class NotFoundException : Exception
{
    public NotFoundException(string entity, object key) : base($"{entity} with id '{key}' was not found.") { }
    public NotFoundException(string message) : base(message) { }
}

/// <summary> Maps to HTTP 400. </summary>
public class ValidationAppException : Exception
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationAppException(IDictionary<string, string[]> errors) : base("One or more validation failures occurred.")
    {
        Errors = errors;
    }

    public ValidationAppException(string message) : base(message)
    {
        Errors = new Dictionary<string, string[]> { { "General", new[] { message } } };
    }
}

/// <summary> Maps to HTTP 403 - authenticated but not permitted for this role/resource. </summary>
public class ForbiddenAccessException : Exception
{
    public ForbiddenAccessException(string message = "You do not have permission to perform this action.") : base(message) { }
}

/// <summary> Maps to HTTP 401. </summary>
public class UnauthorizedAppException : Exception
{
    public UnauthorizedAppException(string message = "Invalid credentials.") : base(message) { }
}

/// <summary> Maps to HTTP 409 - e.g. double-booking a slot, duplicate UHID/Aadhaar. </summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message) { }
}
