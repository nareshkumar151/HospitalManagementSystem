using FluentValidation;

namespace HMS.Application.Features.Patients;

public class UpsertPatientRequestValidator : AbstractValidator<UpsertPatientRequest>
{
    public UpsertPatientRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Mobile).NotEmpty().Matches(@"^\+?[0-9]{10,15}$");
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.AadhaarNumber).Matches(@"^[0-9]{12}$").When(x => !string.IsNullOrWhiteSpace(x.AadhaarNumber));
        RuleFor(x => x.Gender).IsInEnum();
        RuleFor(x => x.BloodGroup).IsInEnum();
        RuleFor(x => x.BranchId).GreaterThan(0);
        RuleFor(x => x).Must(x => x.DateOfBirth != null || x.Age != null)
            .WithMessage("Either Date of Birth or Age must be provided.");
    }
}
