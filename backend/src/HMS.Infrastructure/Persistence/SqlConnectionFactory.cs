using System.Data;
using HMS.Application.Common.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace HMS.Infrastructure.Persistence;

/// <summary>
/// Opens connections to SQL Server on DESKTOP-HALGV0I using Windows (Integrated) Authentication -
/// see appsettings.json "ConnectionStrings:HmsDatabase". No SQL login/password is used.
/// </summary>
public class SqlConnectionFactory : ISqlConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("HmsDatabase")
            ?? throw new InvalidOperationException("Connection string 'HmsDatabase' is not configured.");
    }

    public IDbConnection CreateConnection() => new SqlConnection(_connectionString);
}
