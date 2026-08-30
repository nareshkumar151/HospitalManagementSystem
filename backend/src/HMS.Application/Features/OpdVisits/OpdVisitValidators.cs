using FluentValidation;

namespace HMS.Application.Features.OpdVisits;

public class CompleteConsultationRequestValidator : AbstractValidator<CompleteConsultationRequest>
{
    // Symptoms/Diagnosis/ClinicalNotes accept either typed text or a stylus/handwriting capture saved as a
    // data:image/png;base64,... string (a few hundred KB for a full writing-pad page) - the length ceiling
    // just needs to comfortably clear that, not constrain prose length.
    private const int MaxHandwritingCaptureLength = 3_000_000;

    public CompleteConsultationRequestValidator()
    {
        RuleFor(x => x.Diagnosis).NotEmpty().MaximumLength(MaxHandwritingCaptureLength);
        RuleFor(x => x.Symptoms).MaximumLength(MaxHandwritingCaptureLength);
        RuleFor(x => x.ClinicalNotes).MaximumLength(MaxHandwritingCaptureLength);
        RuleFor(x => x.ReferredToDepartmentId).GreaterThan(0).When(x => x.ReferredToDepartmentId.HasValue);
    }
}
