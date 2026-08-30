using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Billing;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.IpdAdmissions;
using HMS.Application.Features.Patients;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace HMS.Infrastructure.Services;

/// <summary> QuestPDF-based renderer for every printable document the hospital needs (NFR: File Storage / Reports). </summary>
public class PdfService : IPdfService
{
    private const string HospitalName = "City Care Hospital";

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
