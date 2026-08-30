using FluentValidation;

namespace HMS.Application.Features.Appointments;

public class BookAppointmentRequestValidator : AbstractValidator<BookAppointmentRequest>
{
    public BookAppointmentRequestValidator()
    {
        RuleFor(x => x.PatientId).GreaterThan(0);
        RuleFor(x => x.DoctorId).GreaterThan(0);
        RuleFor(x => x.DepartmentId).GreaterThan(0);
        RuleFor(x => x.AppointmentDate.Date).GreaterThanOrEqualTo(DateTime.UtcNow.Date)
            .WithMessage("Appointment date cannot be in the past.");
        RuleFor(x => x.TimeSlot).NotEmpty();
        RuleFor(x => x.Type).IsInEnum();
    }
}

public class RescheduleAppointmentRequestValidator : AbstractValidator<RescheduleAppointmentRequest>
{
    public RescheduleAppointmentRequestValidator()
    {
        RuleFor(x => x.NewDate.Date).GreaterThanOrEqualTo(DateTime.UtcNow.Date);
        RuleFor(x => x.NewTimeSlot).NotEmpty();
    }
}

public class CancelAppointmentRequestValidator : AbstractValidator<CancelAppointmentRequest>
{
    public CancelAppointmentRequestValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(300);
    }
}
