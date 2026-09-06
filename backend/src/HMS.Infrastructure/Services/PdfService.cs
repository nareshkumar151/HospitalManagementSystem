using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Billing;
using HMS.Application.Features.Consents;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.IpdAdmissions;
using HMS.Application.Features.Nursing;
using HMS.Application.Features.Nutrition;
using HMS.Application.Features.BloodBank;
using HMS.Application.Features.Dialysis;
using HMS.Application.Features.Patients;
using HMS.Application.Features.PatientDocuments;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace HMS.Infrastructure.Services;

/// <summary> QuestPDF-based renderer for every printable document the hospital needs (NFR: File Storage / Reports). </summary>
public class PdfService : IPdfService
{
    private const string HospitalName = "Effisys Group";

    public byte[] GenerateDischargeSummaryPdf(DischargeSummaryDto summary)
    {
        return BuildDocument("Discharge Summary", summary.PatientName, column =>
        {
            LabeledRow(column.Item(), "Treating Doctor", summary.DoctorName);
            LabeledRow(column.Item(), "Discharged At", summary.DischargedAt.ToString("dd MMM yyyy, hh:mm tt"));
            Section(column.Item().PaddingTop(10), "Diagnosis", summary.Diagnosis);
            if (!string.IsNullOrWhiteSpace(summary.ChiefComplaint)) Section(column.Item(), "Chief Complaint", summary.ChiefComplaint!);
            if (!string.IsNullOrWhiteSpace(summary.PastHistory)) Section(column.Item(), "Past History", summary.PastHistory!);
            if (!string.IsNullOrWhiteSpace(summary.PhysicalExamination)) Section(column.Item(), "Physical Examination", summary.PhysicalExamination!);
            if (!string.IsNullOrWhiteSpace(summary.Investigation)) Section(column.Item(), "Investigation", summary.Investigation!);
            if (!string.IsNullOrWhiteSpace(summary.CourseInHospital)) Section(column.Item(), "Course in Hospital", summary.CourseInHospital!);
            Section(column.Item(), "Condition at Discharge", summary.ConditionAtDischarge);
            if (!string.IsNullOrWhiteSpace(summary.MedicinesAdvised)) Section(column.Item(), "Medicines Advised", summary.MedicinesAdvised!);
            if (!string.IsNullOrWhiteSpace(summary.DietAdvice)) Section(column.Item(), "Diet Advice", summary.DietAdvice!);
            if (summary.FollowUpDate.HasValue) LabeledRow(column.Item(), "Follow-up Date", summary.FollowUpDate.Value.ToString("dd MMM yyyy"));
            column.Item().PaddingTop(24).AlignRight().Text($"Signed: {summary.DoctorName}").Italic();
        });
    }

    public byte[] GenerateAdmissionDocumentPdf(IpdAdmissionDto admission)
    {
        return BuildDocument("Admission Document", admission.PatientName, column =>
        {
            LabeledRow(column.Item(), "Admission Number", admission.AdmissionNumber);
            LabeledRow(column.Item(), "Admission Date", admission.AdmissionDate.ToString("dd MMM yyyy, hh:mm tt"));
            LabeledRow(column.Item(), "Admission Type", admission.AdmissionType.ToString());
            LabeledRow(column.Item(), "Attending Doctor", admission.DoctorName);
            if (!string.IsNullOrWhiteSpace(admission.NurseName)) LabeledRow(column.Item(), "Assigned Nurse", admission.NurseName!);
            LabeledRow(column.Item(), "Ward / Room / Bed", $"{admission.RoomType} - Room {admission.RoomNumber} - Bed {admission.BedNumber}");
            LabeledRow(column.Item(), "Status", admission.Status.ToString());
            if (!string.IsNullOrWhiteSpace(admission.ReasonForAdmission)) Section(column.Item().PaddingTop(10), "Reason for Admission", admission.ReasonForAdmission!);
            if (admission.DischargeDate.HasValue) LabeledRow(column.Item(), "Discharge Date", admission.DischargeDate.Value.ToString("dd MMM yyyy, hh:mm tt"));
        });
    }

    public byte[] GeneratePatientDetailsPdf(PatientDto patient)
    {
        return BuildDocument("Patient Details", patient.FullName, column =>
        {
            LabeledRow(column.Item(), "UHID", patient.UHID);
            LabeledRow(column.Item(), "Gender", patient.Gender.ToString());
            LabeledRow(column.Item(), "Date of Birth", patient.DateOfBirth?.ToString("dd MMM yyyy") ?? (patient.Age.HasValue ? $"Age {patient.Age}" : "-"));
            LabeledRow(column.Item(), "Mobile", patient.Mobile);
            if (!string.IsNullOrWhiteSpace(patient.Email)) LabeledRow(column.Item(), "Email", patient.Email!);
            if (!string.IsNullOrWhiteSpace(patient.Address)) LabeledRow(column.Item(), "Address", patient.Address!);
            LabeledRow(column.Item(), "Blood Group", patient.BloodGroup.ToString());
            if (!string.IsNullOrWhiteSpace(patient.EmergencyContactName))
                LabeledRow(column.Item(), "Emergency Contact", $"{patient.EmergencyContactName} ({patient.EmergencyContactNumber})");
            if (!string.IsNullOrWhiteSpace(patient.Allergies)) Section(column.Item().PaddingTop(10), "Allergies", patient.Allergies!);
            if (!string.IsNullOrWhiteSpace(patient.InsuranceCompany))
                LabeledRow(column.Item(), "Insurance", $"{patient.InsuranceCompany} ({patient.InsurancePolicyNumber})");
            if (!string.IsNullOrWhiteSpace(patient.ReferredByDoctorName))
                LabeledRow(column.Item(), "Referred By", patient.ReferredByDoctorName!);
            LabeledRow(column.Item(), "Registered On", patient.CreatedAt.ToString("dd MMM yyyy"));
        });
    }

    public byte[] GenerateBillReceiptPdf(BillDto bill)
    {
        return BuildDocument($"Payment Receipt - {bill.BillNumber}", bill.PatientName, column =>
        {
            LabeledRow(column.Item(), "Bill Type", bill.Type.ToString());
            LabeledRow(column.Item(), "Bill Date", bill.BillDate.ToString("dd MMM yyyy, hh:mm tt"));
            LabeledRow(column.Item(), "Status", bill.Status.ToString());

            column.Item().PaddingTop(14).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(4);
                    columns.RelativeColumn(1);
                    columns.RelativeColumn(2);
                    columns.RelativeColumn(2);
                });

                table.Header(header =>
                {
                    foreach (var text in new[] { "Description", "Qty", "Unit Price", "Line Total" })
                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text(text).SemiBold();
                });

                foreach (var item in bill.Items)
                {
                    table.Cell().Padding(5).Text(item.Description);
                    table.Cell().Padding(5).Text(item.Quantity.ToString());
                    table.Cell().Padding(5).Text($"Rs. {item.UnitPrice:N2}");
                    table.Cell().Padding(5).Text($"Rs. {item.LineTotal:N2}");
                }
            });

            column.Item().PaddingTop(10).AlignRight().Column(totals =>
            {
                totals.Item().Text($"Sub Total: Rs. {bill.SubTotal:N2}");
                totals.Item().Text($"GST: Rs. {bill.GstAmount:N2}");
                totals.Item().Text($"Discount: Rs. {bill.DiscountAmount:N2}");
                totals.Item().PaddingTop(4).Text($"Total: Rs. {bill.TotalAmount:N2}").Bold().FontSize(13);
                totals.Item().Text($"Paid: Rs. {bill.PaidAmount:N2}");
                totals.Item().Text($"Balance: Rs. {(bill.TotalAmount - bill.PaidAmount):N2}").SemiBold();
            });
        });
    }

    public byte[] GenerateConsentRecordPdf(ConsentRecordDto record)
    {
        return BuildDocument(record.TemplateTitle, record.PatientName, column => RenderConsent(column.Item(), record));
    }

    public byte[] GenerateSurgeryFormsPdf(SurgeryFormsBundle bundle)
    {
        return BuildDocument($"OT Forms - {bundle.Surgery.SurgeryName}", bundle.Surgery.PatientName, column => RenderSurgeryBundle(column.Item(), bundle));
    }

    public byte[] GenerateErVisitPdf(ErVisitBundle bundle)
    {
        return BuildDocument("Emergency (ER) Visit", bundle.Visit.PatientName, column => RenderErBundle(column.Item(), bundle));
    }

    public byte[] GenerateNursingChartPdf(string patientName, string admissionNumber, IReadOnlyList<NursingChartDto> chart)
    {
        return BuildDocument($"Nursing Clinical Chart - {admissionNumber}", patientName, column => RenderNursingChart(column.Item(), chart));
    }

    public byte[] GenerateTransfusionReactionPdf(TransfusionReactionDto record)
    {
        return BuildDocument("Transfusion Reaction Form", record.PatientName, column => RenderTransfusionReaction(column.Item(), record));
    }

    public byte[] GenerateDialysisSessionPdf(DialysisSessionDto record)
    {
        return BuildDocument("Dialysis Record", record.PatientName, column => RenderDialysisSession(column.Item(), record));
    }

    public byte[] GenerateNutritionAssessmentPdf(NutritionAssessmentDto record)
    {
        return BuildDocument("Initial Assessment by Nutrition", record.PatientName, column => RenderNutritionAssessment(column.Item(), record));
    }

    public byte[] GeneratePatientDocumentBundlePdf(PatientDocumentBundleDto bundle)
    {
        var admission = bundle.Admission;
        return BuildDocument("Complete Patient Document Bundle", $"{admission.PatientName} ({admission.UHID})", column =>
        {
            SectionHeading(column.Item(), "Admission Details");
            LabeledRow(column.Item(), "Admission Number", admission.AdmissionNumber);
            LabeledRow(column.Item(), "Admission Date", admission.AdmissionDate.ToString("dd MMM yyyy, hh:mm tt"));
            LabeledRow(column.Item(), "Attending Doctor", admission.DoctorName);
            LabeledRow(column.Item(), "Ward / Room / Bed", $"{admission.RoomType} - Room {admission.RoomNumber} - Bed {admission.BedNumber}");
            LabeledRow(column.Item(), "Status", admission.Status.ToString());

            if (bundle.DischargeSummary is { } summary)
            {
                SectionHeading(column.Item().PaddingTop(16), "Discharge Summary");
                LabeledRow(column.Item(), "Discharged At", summary.DischargedAt.ToString("dd MMM yyyy, hh:mm tt"));
                Section(column.Item(), "Diagnosis", summary.Diagnosis);
                Section(column.Item(), "Condition at Discharge", summary.ConditionAtDischarge);
                if (!string.IsNullOrWhiteSpace(summary.MedicinesAdvised)) Section(column.Item(), "Medicines Advised", summary.MedicinesAdvised!);
                if (!string.IsNullOrWhiteSpace(summary.DietAdvice)) Section(column.Item(), "Diet Advice", summary.DietAdvice!);
            }

            if (bundle.Consents.Count > 0)
            {
                SectionHeading(column.Item().PaddingTop(16), $"Consent Forms ({bundle.Consents.Count})");
                foreach (var consent in bundle.Consents) RenderConsent(column.Item().PaddingTop(6), consent);
            }

            foreach (var surgery in bundle.Surgeries)
            {
                SectionHeading(column.Item().PaddingTop(16), $"Operation Theatre - {surgery.Surgery.SurgeryName}");
                RenderSurgeryBundle(column.Item(), surgery);
            }

            if (bundle.NursingChart.Count > 0)
            {
                SectionHeading(column.Item().PaddingTop(16), "Nursing Clinical Chart");
                RenderNursingChart(column.Item(), bundle.NursingChart);
            }

            foreach (var er in bundle.ErVisits)
            {
                SectionHeading(column.Item().PaddingTop(16), "Emergency (ER) Visit");
                RenderErBundle(column.Item(), er);
            }

            if (bundle.TransfusionReactions.Count > 0)
            {
                SectionHeading(column.Item().PaddingTop(16), "Blood Bank - Transfusion Reactions");
                foreach (var t in bundle.TransfusionReactions) RenderTransfusionReaction(column.Item().PaddingTop(6), t);
            }

            if (bundle.DialysisSessions.Count > 0)
            {
                SectionHeading(column.Item().PaddingTop(16), "Dialysis Records");
                foreach (var d in bundle.DialysisSessions) RenderDialysisSession(column.Item().PaddingTop(6), d);
            }

            if (bundle.NutritionAssessments.Count > 0)
            {
                SectionHeading(column.Item().PaddingTop(16), "Nutrition Assessments");
                foreach (var n in bundle.NutritionAssessments) RenderNutritionAssessment(column.Item().PaddingTop(6), n);
            }
        });
    }

    private static void RenderConsent(IContainer container, ConsentRecordDto record)
    {
        container.Column(column =>
        {
            LabeledRow(column.Item(), "Category", record.Category);
            LabeledRow(column.Item(), "Context", record.Context + (record.ProcedureName != null ? $" - {record.ProcedureName}" : ""));
            LabeledRow(column.Item(), "Decision", record.Decision);
            LabeledRow(column.Item(), "Signed By", record.SignedByName + (record.RelationToPatient != null ? $" ({record.RelationToPatient})" : ""));
            if (!string.IsNullOrWhiteSpace(record.WitnessName)) LabeledRow(column.Item(), "Witness", record.WitnessName!);
            if (!string.IsNullOrWhiteSpace(record.RefusalReason)) LabeledRow(column.Item(), "Refusal Reason", record.RefusalReason!);
            LabeledRow(column.Item(), "Signed At", record.SignedAt.ToString("dd MMM yyyy, hh:mm tt"));
            LabeledRow(column.Item(), "Recorded By", record.RecordedByName);
            column.Item().PaddingTop(4).Text(record.TemplateTitle).Italic().FontSize(9);
        });
    }

    private static void RenderSurgeryBundle(IContainer container, SurgeryFormsBundle bundle)
    {
        container.Column(column =>
        {
            var s = bundle.Surgery;
            LabeledRow(column.Item(), "Surgeon", s.SurgeonName);
            LabeledRow(column.Item(), "Scheduled At", s.ScheduledAt.ToString("dd MMM yyyy, hh:mm tt"));
            LabeledRow(column.Item(), "Status", s.Status);
            if (!string.IsNullOrWhiteSpace(s.OperationNotes)) Section(column.Item(), "Operation Notes", s.OperationNotes!);

            foreach (var checklist in bundle.Checklists)
            {
                column.Item().PaddingTop(8).Text($"{checklist.ChecklistType} (completed by {checklist.CompletedByName}, {checklist.CompletedAt:dd MMM yyyy})").SemiBold();
                foreach (var item in checklist.Items)
                    column.Item().PaddingLeft(10).Text($"{(item.Checked ? "[x]" : "[ ]")} {item.Label}").FontSize(9);
                if (!string.IsNullOrWhiteSpace(checklist.Remarks)) column.Item().PaddingLeft(10).Text($"Remarks: {checklist.Remarks}").FontSize(9).Italic();
            }

            if (bundle.AnesthesiaRecords.Count > 0)
            {
                column.Item().PaddingTop(8).Text("Anesthesia Monitoring Record").SemiBold();
                foreach (var a in bundle.AnesthesiaRecords)
                    column.Item().PaddingLeft(10).Text($"{a.RecordedAt:hh:mm tt} - BP {a.BloodPressure ?? "-"}, Pulse {a.PulseRate?.ToString() ?? "-"}, SpO2 {a.SpO2?.ToString() ?? "-"}%, Temp {a.Temperature?.ToString() ?? "-"}°F ({a.RecordedByName})").FontSize(9);
            }

            if (bundle.RecoveryRecords.Count > 0)
            {
                column.Item().PaddingTop(8).Text("Post-Op Recovery Record (Aldrete Score)").SemiBold();
                foreach (var r in bundle.RecoveryRecords)
                    column.Item().PaddingLeft(10).Text($"{r.RecordedAt:hh:mm tt} - Aldrete {r.AldreteTotal}/10, BP {r.BloodPressure ?? "-"}{(r.DischargedFromRecoveryAt.HasValue ? " - Discharged" : "")} ({r.RecordedByName})").FontSize(9);
            }
        });
    }

    private static void RenderErBundle(IContainer container, ErVisitBundle bundle)
    {
        container.Column(column =>
        {
            var v = bundle.Visit;
            LabeledRow(column.Item(), "Arrival", $"{v.ArrivalTime:dd MMM yyyy, hh:mm tt} ({v.ModeOfArrival ?? "-"})");
            LabeledRow(column.Item(), "Chief Complaint", v.ChiefComplaint);
            LabeledRow(column.Item(), "Triage Category", v.TriageCategory);
            LabeledRow(column.Item(), "Status", v.Status);

            foreach (var n in bundle.NurseAssessments)
            {
                column.Item().PaddingTop(6).Text($"ER Nurses Assessment - {n.AssessedAt:dd MMM yyyy, hh:mm tt} ({n.NurseName})").SemiBold().FontSize(10);
                column.Item().PaddingLeft(10).Text($"BP {n.BloodPressure ?? "-"}, Pulse {n.Pulse?.ToString() ?? "-"}, Temp {n.Temperature?.ToString() ?? "-"}°F, RR {n.RespiratoryRate?.ToString() ?? "-"}, SpO2 {n.SpO2?.ToString() ?? "-"}%, Pain {n.PainScore?.ToString() ?? "-"}/10, GCS {n.GcsTotal?.ToString() ?? "-"}").FontSize(9);
                if (!string.IsNullOrWhiteSpace(n.InitialActions)) column.Item().PaddingLeft(10).Text($"Initial actions: {n.InitialActions}").FontSize(9);
            }

            foreach (var d in bundle.DoctorAssessments)
            {
                column.Item().PaddingTop(6).Text($"ER Doctor Assessment - {d.AssessedAt:dd MMM yyyy, hh:mm tt} ({d.DoctorName})").SemiBold().FontSize(10);
                if (!string.IsNullOrWhiteSpace(d.HistoryOfPresentIllness)) column.Item().PaddingLeft(10).Text($"HPI: {d.HistoryOfPresentIllness}").FontSize(9);
                if (!string.IsNullOrWhiteSpace(d.ExaminationFindings)) column.Item().PaddingLeft(10).Text($"Examination: {d.ExaminationFindings}").FontSize(9);
                if (!string.IsNullOrWhiteSpace(d.ProvisionalDiagnosis)) column.Item().PaddingLeft(10).Text($"Diagnosis: {d.ProvisionalDiagnosis}").FontSize(9);
                if (!string.IsNullOrWhiteSpace(d.TreatmentGiven)) column.Item().PaddingLeft(10).Text($"Treatment: {d.TreatmentGiven}").FontSize(9);
                column.Item().PaddingLeft(10).Text($"Disposition: {d.Disposition}").FontSize(9).SemiBold();
            }
        });
    }

    private static void RenderNursingChart(IContainer container, IReadOnlyList<NursingChartDto> chart)
    {
        container.Column(column =>
        {
            foreach (var entry in chart)
            {
                column.Item().PaddingTop(4).Text($"{entry.RecordedAt:dd MMM yyyy, hh:mm tt} ({entry.NurseName})").SemiBold().FontSize(9);
                column.Item().PaddingLeft(10).Text(
                    $"Temp {entry.Temperature?.ToString() ?? "-"}°F, Pulse {entry.Pulse?.ToString() ?? "-"}, BP {entry.BloodPressure ?? "-"}, SpO2 {entry.Oxygen?.ToString() ?? "-"}%, RR {entry.RespiratoryRate?.ToString() ?? "-"}, Pain {entry.PainScore?.ToString() ?? "-"}/10, AVPU {entry.Consciousness ?? "-"}, EWS {entry.EarlyWarningScore?.ToString() ?? "-"}")
                    .FontSize(9);
                if (!string.IsNullOrWhiteSpace(entry.DailyNotes)) column.Item().PaddingLeft(10).Text($"Notes: {entry.DailyNotes}").FontSize(9).Italic();
            }
        });
    }

    private static void RenderTransfusionReaction(IContainer container, TransfusionReactionDto record)
    {
        container.Column(column =>
        {
            LabeledRow(column.Item(), "Onset", record.OnsetTime.ToString("dd MMM yyyy, hh:mm tt"));
            LabeledRow(column.Item(), "Component", $"{record.ComponentTransfused} ({record.UnitsTransfused?.ToString() ?? "-"} units, {record.BloodGroup ?? "-"})");
            LabeledRow(column.Item(), "Reaction Type", record.ReactionType);
            if (!string.IsNullOrWhiteSpace(record.Symptoms)) LabeledRow(column.Item(), "Symptoms", record.Symptoms!);
            if (!string.IsNullOrWhiteSpace(record.ActionTaken)) LabeledRow(column.Item(), "Action Taken", record.ActionTaken!);
            LabeledRow(column.Item(), "Outcome", record.Outcome);
            LabeledRow(column.Item(), "Reported By", record.ReportedByName);
        });
    }

    private static void RenderDialysisSession(IContainer container, DialysisSessionDto record)
    {
        container.Column(column =>
        {
            LabeledRow(column.Item(), "Session Date", record.SessionDate.ToString("dd MMM yyyy, hh:mm tt"));
            LabeledRow(column.Item(), "Type", $"{record.DialysisType} ({record.DurationMinutes?.ToString() ?? "-"} min)");
            LabeledRow(column.Item(), "Weight (Pre/Post)", $"{record.PreWeight?.ToString() ?? "-"} / {record.PostWeight?.ToString() ?? "-"} kg");
            LabeledRow(column.Item(), "BP (Pre/Post)", $"{record.PreBloodPressure ?? "-"} / {record.PostBloodPressure ?? "-"}");
            LabeledRow(column.Item(), "UF Goal/Achieved", $"{record.UfGoal?.ToString() ?? "-"} / {record.UfAchieved?.ToString() ?? "-"} L");
            if (!string.IsNullOrWhiteSpace(record.Complications)) LabeledRow(column.Item(), "Complications", record.Complications!);
            LabeledRow(column.Item(), "Performed By", record.PerformedByName);
        });
    }

    private static void RenderNutritionAssessment(IContainer container, NutritionAssessmentDto record)
    {
        container.Column(column =>
        {
            LabeledRow(column.Item(), "Assessed At", record.AssessedAt.ToString("dd MMM yyyy, hh:mm tt"));
            LabeledRow(column.Item(), "Height / Weight", $"{record.HeightCm?.ToString() ?? "-"} cm / {record.WeightKg?.ToString() ?? "-"} kg (BMI {(record.Bmi.HasValue ? record.Bmi.Value.ToString("0.#") : "-")})");
            LabeledRow(column.Item(), "Diet Type", record.DietType);
            LabeledRow(column.Item(), "Nutritional Risk", record.NutritionalRisk);
            if (!string.IsNullOrWhiteSpace(record.DietaryHistory)) LabeledRow(column.Item(), "Dietary History", record.DietaryHistory!);
            if (!string.IsNullOrWhiteSpace(record.Allergies)) LabeledRow(column.Item(), "Allergies", record.Allergies!);
            if (!string.IsNullOrWhiteSpace(record.Recommendations)) LabeledRow(column.Item(), "Recommendations", record.Recommendations!);
            LabeledRow(column.Item(), "Assessed By", record.AssessedByName);
        });
    }

    private static void SectionHeading(IContainer container, string title)
    {
        container.Column(column =>
        {
            column.Item().Text(title).FontSize(13).Bold().FontColor(Colors.Blue.Darken2);
            column.Item().PaddingBottom(4).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
        });
    }

    /// <summary> Shared A4 letterhead + footer wrapper so every document looks like it belongs to the same hospital. </summary>
    private static byte[] BuildDocument(string title, string subjectName, Action<ColumnDescriptor> body)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(11));

                page.Header().Column(column =>
                {
                    column.Item().Text(HospitalName).FontSize(18).Bold();
                    column.Item().Text(title).FontSize(14).FontColor(Colors.Blue.Darken2);
                    column.Item().PaddingTop(2).Text($"Patient/Subject: {subjectName}").SemiBold();
                    column.Item().PaddingTop(2).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
                });

                page.Content().PaddingVertical(12).Column(body);

                page.Footer().Row(row =>
                {
                    row.RelativeItem().Text($"Generated {DateTime.Now:dd MMM yyyy, hh:mm tt}").FontSize(8).FontColor(Colors.Grey.Darken1);
                    row.RelativeItem().AlignRight().Text(text =>
                    {
                        text.CurrentPageNumber().FontSize(8);
                        text.Span(" / ").FontSize(8);
                        text.TotalPages().FontSize(8);
                    });
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void LabeledRow(IContainer container, string label, string value)
    {
        container.PaddingBottom(3).Row(row =>
        {
            row.ConstantItem(150).Text(label).SemiBold();
            row.RelativeItem().Text(value);
        });
    }

    private static void Section(IContainer container, string label, string value)
    {
        container.PaddingBottom(8).Column(column =>
        {
            column.Item().Text(label).SemiBold().FontColor(Colors.Blue.Darken1);
            column.Item().Text(value);
        });
    }
}
