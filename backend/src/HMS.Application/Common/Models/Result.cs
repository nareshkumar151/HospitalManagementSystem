namespace HMS.Application.Common.Models;

/// <summary> Uniform success/failure envelope returned by every Application service method. </summary>
public class Result
{
    public bool Succeeded { get; protected init; }
    public string[] Errors { get; protected init; } = Array.Empty<string>();

    public static Result Success() => new() { Succeeded = true };
    public static Result Failure(params string[] errors) => new() { Succeeded = false, Errors = errors };
}

public class Result<T> : Result
{
    public T? Data { get; private init; }

    public static Result<T> Success(T data) => new() { Succeeded = true, Data = data };
    public static new Result<T> Failure(params string[] errors) => new() { Succeeded = false, Errors = errors };
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int TotalCount { get; init; }
    public int PageNumber { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

public class PagedRequest
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; }
}
