using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Attendance;
using HMS.Application.Features.Auth;
using HMS.Application.Features.Beds;
using HMS.Application.Features.Billing;
using HMS.Application.Features.Dashboard;
using HMS.Application.Features.Departments;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.Doctors;
using HMS.Application.Features.Employees;
using HMS.Application.Features.Insurance;
using HMS.Application.Features.Inventory;
using HMS.Application.Features.IpdAdmissions;
using HMS.Application.Features.Laboratory;
using HMS.Application.Features.MedicalRecords;
using HMS.Application.Features.Notifications;
using HMS.Application.Features.OpdVisits;
using HMS.Application.Features.OperationTheatre;
using HMS.Application.Features.Patients;
using HMS.Application.Features.Payroll;
using HMS.Application.Features.Pharmacy;
using HMS.Application.Features.Prescriptions;
using HMS.Application.Features.Radiology;
using HMS.Application.Features.Reports;
using HMS.Application.Features.Vendors;
using HMS.Application.Features.Appointments;
using HMS.Application.Features.Nursing;
using HMS.Infrastructure.Identity;
using HMS.Infrastructure.Payments;
using HMS.Infrastructure.Persistence;
using HMS.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuestPDF.Infrastructure;

namespace HMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // QuestPDF Community license - free for small teams; see https://www.questpdf.com/license/ before scaling up.
        QuestPDF.Settings.License = LicenseType.Community;

        services.Configure<JwtSettings>(configuration.GetSection("Jwt"));
        services.Configure<RazorpaySettings>(configuration.GetSection("Razorpay"));

        services.AddHttpContextAccessor();

        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddScoped<ISqlDataAccess, SqlDataAccess>();

        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
        services.AddScoped<IAuditService, AuditService>();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPatientService, PatientService>();
        services.AddScoped<IDoctorService, DoctorService>();
        services.AddScoped<IDepartmentService, DepartmentService>();
        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<IOpdVisitService, OpdVisitService>();
        services.AddScoped<IPrescriptionService, PrescriptionService>();
        services.AddScoped<IBedService, BedService>();
        services.AddScoped<IIpdAdmissionService, IpdAdmissionService>();
        services.AddScoped<INursingService, NursingService>();
        services.AddScoped<ILaboratoryService, LaboratoryService>();
        services.AddScoped<IRadiologyService, RadiologyService>();
        services.AddScoped<IPharmacyService, PharmacyService>();
        services.AddScoped<IBillingService, BillingService>();
        services.AddScoped<IInsuranceService, InsuranceService>();
        services.AddScoped<IOperationTheatreService, OperationTheatreService>();
        services.AddScoped<IDischargeService, DischargeService>();
        services.AddScoped<IMedicalRecordService, MedicalRecordService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<IVendorService, VendorService>();
        services.AddScoped<IPayrollService, PayrollService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IPdfService, PdfService>();

        services.AddHttpClient<IRazorpayGateway, RazorpayGateway>();

        return services;
    }
}
