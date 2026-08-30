namespace HMS.Application.Common.Interfaces;

/// <summary>
/// Thin Dapper wrapper - every call maps to exactly one stored procedure (see /database/StoredProcedures).
/// No inline SQL is ever issued from the application layer.
/// </summary>
public interface ISqlDataAccess
{
    Task<IReadOnlyList<T>> QueryAsync<T>(string storedProcedure, object? parameters = null);
    Task<T?> QuerySingleOrDefaultAsync<T>(string storedProcedure, object? parameters = null);
    Task<T> QuerySingleAsync<T>(string storedProcedure, object? parameters = null);

    /// <summary> For procs that SELECT two result sets (e.g. rows + a TotalCount row for paging). </summary>
    Task<(IReadOnlyList<T1> Items, IReadOnlyList<T2> Second)> QueryMultipleAsync<T1, T2>(string storedProcedure, object? parameters = null);

    Task<int> ExecuteAsync(string storedProcedure, object? parameters = null);
    Task<T> ExecuteScalarAsync<T>(string storedProcedure, object? parameters = null);
}
