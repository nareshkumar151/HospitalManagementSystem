using System.Data;
using Dapper;
using HMS.Application.Common.Interfaces;

namespace HMS.Infrastructure.Persistence;

public class SqlDataAccess : ISqlDataAccess
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public SqlDataAccess(ISqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<T>> QueryAsync<T>(string storedProcedure, object? parameters = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        var result = await connection.QueryAsync<T>(storedProcedure, parameters, commandType: CommandType.StoredProcedure);
        return result.AsList();
    }

    public async Task<T?> QuerySingleOrDefaultAsync<T>(string storedProcedure, object? parameters = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<T>(storedProcedure, parameters, commandType: CommandType.StoredProcedure);
    }

    public async Task<T> QuerySingleAsync<T>(string storedProcedure, object? parameters = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.QuerySingleAsync<T>(storedProcedure, parameters, commandType: CommandType.StoredProcedure);
    }

    public async Task<(IReadOnlyList<T1> Items, IReadOnlyList<T2> Second)> QueryMultipleAsync<T1, T2>(string storedProcedure, object? parameters = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        using var multi = await connection.QueryMultipleAsync(storedProcedure, parameters, commandType: CommandType.StoredProcedure);
        var items = (await multi.ReadAsync<T1>()).AsList();
        var second = (await multi.ReadAsync<T2>()).AsList();
        return (items, second);
    }

    public async Task<int> ExecuteAsync(string storedProcedure, object? parameters = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteAsync(storedProcedure, parameters, commandType: CommandType.StoredProcedure);
    }

    public async Task<T> ExecuteScalarAsync<T>(string storedProcedure, object? parameters = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<T>(storedProcedure, parameters, commandType: CommandType.StoredProcedure);
    }
}
