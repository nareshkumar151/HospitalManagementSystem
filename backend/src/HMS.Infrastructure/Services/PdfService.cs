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
using HMS.Domain.Enums;
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

    // Fixed print order for the provisional bill's sections, matching the reference hospital format - a null
    // or unrecognised BillItemDto.Section (every item saved before 19_Schema_BillingRatesAndSections.sql)
    // falls back to "Others" rather than being dropped.
    private static readonly (string Key, string Label)[] BillSectionOrder =
    {
        ("RoomTariff", "ROOM TARIFF"),
        ("Consultation", "CONSULTATIONS"),
        ("Investigation", "INVESTIGATION"),
        ("GeneralService", "GENERAL SERVICE"),
        ("Others", "OTHERS"),
    };

    public byte[] GenerateBillReceiptPdf(BillReceiptDto receipt)
    {
        var bill = receipt.Bill;
        var isIpd = bill.Category == BillCategory.IPD;
        var docTitle = $"{(isIpd ? "In Patient" : "Outpatient")} Provisional Bill";
        var balance = bill.TotalAmount - bill.PaidAmount;

        var groups = BillSectionOrder
            .Select(s => (s.Label, Items: bill.Items.Where(i => (i.Section ?? "Others") == s.Key).ToList()))
            .Where(g => g.Items.Count > 0)
            .ToList();

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(0);
                page.DefaultTextStyle(x => x.FontSize(9.5f).FontColor(Colors.Grey.Darken3));

                page.Header().Column(column =>
                {
                    column.Item().Padding(16).Row(row =>
                    {
                        row.RelativeItem().Column(inner =>
                        {
                            inner.Item().Text(HospitalName).FontSize(18).Bold().FontColor(Color.FromHex(BrandHex));
                            inner.Item().PaddingTop(2).Text(receipt.BranchAddress).FontSize(8.5f);
                            if (!string.IsNullOrWhiteSpace(receipt.BranchContactNumber))
                                inner.Item().Text($"Ph: {receipt.BranchContactNumber}").FontSize(8.5f);
                        });
                        row.ConstantItem(200).AlignRight().AlignMiddle().Text(docTitle).FontSize(13).Bold().FontColor(Color.FromHex(BrandHex));
                    });
                    column.Item().LineHorizontal(1).LineColor(Color.FromHex(BrandHex));

                    column.Item().Padding(14).Row(row =>
                    {
                        row.RelativeItem().Column(left =>
                        {
                            if (!string.IsNullOrWhiteSpace(receipt.AdmissionNumber)) BillInfoRow(left.Item(), "IPID", receipt.AdmissionNumber!);
                            BillInfoRow(left.Item(), "UHID", receipt.PatientUhid);
                            BillInfoRow(left.Item(), "Age/Sex", $"{(receipt.PatientAge is { } age ? $"{age} years" : "-")}/{receipt.PatientGender}");
                            BillInfoRow(left.Item(), "Patient", bill.PatientName);
                        });
                        row.RelativeItem().Column(right =>
                        {
                            if (receipt.AdmissionDate is { } admitted) BillInfoRow(right.Item(), "Admission Date", admitted.ToString("dd-MM-yyyy hh:mm tt"));
                            if (!string.IsNullOrWhiteSpace(receipt.DoctorName)) BillInfoRow(right.Item(), "Doctor", receipt.DoctorName!);
                            BillInfoRow(right.Item(), "Pat Type", receipt.HasInsurance ? "Insurance" : "Cash");
                            BillInfoRow(right.Item(), "Bill No", bill.BillNumber);
                        });
                    });
                });

                page.Content().PaddingHorizontal(20).PaddingVertical(10).Column(column =>
                {
                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(4);
                            columns.RelativeColumn(1.3f);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(1.5f);
                        });
                        table.Header(header =>
                        {
                            foreach (var text in new[] { "Particulars", "Rate", "Date & Time", "Qty", "Amount" })
                                header.Cell().BorderBottom(1).BorderColor(Colors.Grey.Darken1).PaddingVertical(4).Text(text).SemiBold().FontSize(9);
                        });

                        foreach (var (label, items) in groups)
                        {
                            table.Cell().ColumnSpan(5).PaddingTop(8).PaddingBottom(2).Text(label).Bold().FontColor(Color.FromHex(BrandHex));

                            foreach (var item in items)
                            {
                                var when = item.ItemDate ?? bill.BillDate;
                                table.Cell().PaddingVertical(2).Text(item.Description).FontSize(9);
                                table.Cell().PaddingVertical(2).Text($"{item.UnitPrice:N0}").FontSize(9);
                                table.Cell().PaddingVertical(2).Text(when.ToString("dd-MM-yyyy hh:mm tt")).FontSize(9);
                                table.Cell().PaddingVertical(2).Text(item.Quantity.ToString("0.0")).FontSize(9);
                                table.Cell().PaddingVertical(2).AlignRight().Text($"{item.LineTotal:N2}").FontSize(9);
                            }

                            table.Cell().ColumnSpan(4).AlignRight().PaddingTop(2).Text("").FontSize(9);
                            table.Cell().AlignRight().PaddingTop(2).BorderTop(0.5f).BorderColor(Colors.Grey.Lighten1)
                                .Text($"{items.Sum(i => i.LineTotal):N2}").SemiBold().FontSize(9);
                        }
                    });

                    if (receipt.Payments.Count > 0)
                    {
                        column.Item().PaddingTop(14).Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(2);
                            });
                            table.Header(header =>
                            {
                                foreach (var text in new[] { "Receipt No", "Date", "Amount", "Mode" })
                                    header.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text(text).SemiBold().FontSize(9);
                            });
                            foreach (var p in receipt.Payments)
                            {
                                table.Cell().Padding(4).Text(p.ReceiptNumber).FontSize(9);
                                table.Cell().Padding(4).Text(p.PaidAt.ToString("dd-MM-yyyy")).FontSize(9);
                                table.Cell().Padding(4).Text($"{(p.IsRefund ? "-" : "")}{p.Amount:N2}").FontSize(9);
                                table.Cell().Padding(4).Text(p.Mode.ToString()).FontSize(9);
                            }
                        });
                        column.Item().PaddingTop(4).AlignRight().Text($"Advance Paid: {bill.PaidAmount:N2}").Bold().FontSize(10);
                    }

                    column.Item().PaddingTop(14).AlignRight().Width(260).Column(totals =>
                    {
                        if (bill.DiscountAmount > 0) BillTotalRow(totals.Item(), "Discount", $"- {bill.DiscountAmount:N2}");
                        if (bill.GstAmount > 0) BillTotalRow(totals.Item(), "GST", bill.GstAmount.ToString("N2"));
                        BillTotalRow(totals.Item().PaddingTop(3).BorderTop(1).BorderColor(Colors.Grey.Darken1), "Bill Amount", bill.TotalAmount.ToString("N2"), bold: true);
                        BillTotalRow(totals.Item(), "Amount Received", bill.PaidAmount.ToString("N2"));
                        BillTotalRow(totals.Item().BorderTop(1).BorderColor(Colors.Grey.Darken1), "Balance Amount", balance.ToString("N2"), bold: true);
                    });

                    column.Item().PaddingTop(10).Text($"Billed Amount In Words : {NumberToWordsIndian(bill.TotalAmount)}").FontSize(9).Italic();

                    column.Item().PaddingTop(24).Row(row =>
                    {
                        row.RelativeItem().Text(t =>
                        {
                            t.Span("Prepared By : ").SemiBold();
                            t.Span(receipt.GeneratedByName);
                        });
                        // A stylus-signed bill (Generate Bill's optional Signature field) prints the actual
                        // capture here instead of leaving a blank line for a wet-ink signature.
                        var signature = receipt.PreparedBySignature ?? "";
                        if (IsHandwritingCapture(signature))
                        {
                            var base64 = signature[(signature.IndexOf(',') + 1)..];
                            row.RelativeItem().Column(sig =>
                            {
                                sig.Item().AlignRight().Height(40).Width(150).Image(Convert.FromBase64String(base64)).FitArea();
                                sig.Item().AlignRight().Text("Signature").FontSize(8).SemiBold();
                            });
                        }
                        else
                        {
                            row.RelativeItem().AlignRight().Text("Signature").SemiBold();
                        }
                    });
                });

                page.Footer().PaddingHorizontal(20).PaddingBottom(10).Column(column =>
                {
                    column.Item().LineHorizontal(0.75f).LineColor(Colors.Grey.Lighten2);
                    column.Item().PaddingTop(4).Row(row =>
                    {
                        row.RelativeItem().Text($"Generated {DateTime.Now:dd MMM yyyy, hh:mm tt} · System-generated document.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Darken1);
                        row.RelativeItem().AlignRight().Text(text =>
                        {
                            text.CurrentPageNumber().FontSize(8);
                            text.Span(" / ").FontSize(8);
                            text.TotalPages().FontSize(8);
                        });
                    });
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void BillInfoRow(IContainer container, string label, string value)
    {
        container.PaddingBottom(2).Row(row =>
        {
            row.ConstantItem(90).Text(label).SemiBold().FontSize(9);
            row.RelativeItem().Text(value).FontSize(9);
        });
    }

    private static void BillTotalRow(IContainer container, string label, string value, bool bold = false)
    {
        container.PaddingVertical(2).Row(row =>
        {
            if (bold)
            {
                row.RelativeItem().Text(label).FontSize(10.5f).Bold();
                row.ConstantItem(100).AlignRight().Text($"Rs. {value}").FontSize(10.5f).Bold();
            }
            else
            {
                row.RelativeItem().Text(label).FontSize(9.5f);
                row.ConstantItem(100).AlignRight().Text($"Rs. {value}").FontSize(9.5f);
            }
        });
    }

    /// <summary> Indian numbering (Crore/Lakh, not the Western Million/Billion) - matches how a rupee amount
    /// is conventionally spelled out on an Indian hospital bill. Whole rupees only - a provisional bill's
    /// paise, if any, are dropped from the words line the same way the reference format does. </summary>
    private static string NumberToWordsIndian(decimal amount)
    {
        var rupees = (long)Math.Floor(amount);
        if (rupees == 0) return "Zero Only";

        var crore = rupees / 10000000; rupees %= 10000000;
        var lakh = rupees / 100000; rupees %= 100000;
        var thousand = rupees / 1000; rupees %= 1000;
        var hundred = rupees / 100; rupees %= 100;
        var remainder = rupees;

        var words = new System.Text.StringBuilder();
        if (crore > 0) words.Append(BelowThousandToWords(crore)).Append(" Crore ");
        if (lakh > 0) words.Append(BelowThousandToWords(lakh)).Append(" Lakh ");
        if (thousand > 0) words.Append(BelowThousandToWords(thousand)).Append(" Thousand ");
        if (hundred > 0) words.Append(BelowThousandToWords(hundred)).Append(" Hundred ");
        if (remainder > 0) words.Append(BelowThousandToWords(remainder)).Append(' ');

        return words.ToString().Trim() + " Only";
    }

    private static readonly string[] Ones =
    {
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    };
    private static readonly string[] Tens = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

    private static string BelowThousandToWords(long n)
    {
        if (n < 20) return Ones[n];
        if (n < 100) return (Tens[n / 10] + " " + Ones[n % 10]).Trim();
        return (Ones[n / 100] + " Hundred " + BelowThousandToWords(n % 100)).Trim();
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
            column.Item().Row(row =>
            {
                row.RelativeItem().Text(record.TemplateTitle + (record.ProcedureName != null ? $" — {record.ProcedureName}" : ""))
                    .FontSize(12).Bold().FontColor(Color.FromHex(BrandHex));
                row.ConstantItem(100).Element(c => DecisionChip(c, record.Decision));
            });
            column.Item().PaddingTop(6).Element(c => LegalTextBlock(c, record.TemplateBodyText));

            column.Item().PaddingTop(10).Row(row =>
            {
                row.RelativeItem().Column(left =>
                {
                    LabeledRow(left.Item(), "Category", record.Category);
                    LabeledRow(left.Item(), "Context", record.Context);
                    if (IsHandwritingCapture(record.SignedByName))
                    {
                        LabeledSignatureRow(left.Item(), "Signed By", record.SignedByName);
                        if (record.RelationToPatient != null) LabeledRow(left.Item(), "Relation", record.RelationToPatient);
                    }
                    else
                    {
                        LabeledRow(left.Item(), "Signed By", record.SignedByName + (record.RelationToPatient != null ? $" ({record.RelationToPatient})" : ""));
                    }
                });
                row.RelativeItem().Column(right =>
                {
                    LabeledRow(right.Item(), "Signed At", record.SignedAt.ToString("dd MMM yyyy, hh:mm tt"));
                    if (!string.IsNullOrWhiteSpace(record.WitnessName)) LabeledRow(right.Item(), "Witness", record.WitnessName!);
                    LabeledRow(right.Item(), "Recorded By", record.RecordedByName);
                });
            });
            if (!string.IsNullOrWhiteSpace(record.RefusalReason))
                column.Item().PaddingTop(4).Text(text => { text.Span("Refusal Reason: ").SemiBold().FontColor(Colors.Red.Darken1); text.Span(record.RefusalReason!); });

            // Signature block - shows the actual stylus capture when the patient/family member signed
            // digitally; falls back to a blank wet-ink line (a printed copy still needs somewhere to sign)
            // when they were only typed in by name. Witness signature is always blank - no capture for it.
            column.Item().PaddingTop(16).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    if (IsHandwritingCapture(record.SignedByName))
                        c.Item().Height(40).Image(Convert.FromBase64String(record.SignedByName[(record.SignedByName.IndexOf(',') + 1)..])).FitArea();
                    else
                        c.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
                    c.Item().PaddingTop(2).Text("Patient / Representative Signature").FontSize(8).FontColor(Colors.Grey.Darken1);
                });
                row.ConstantItem(20);
                row.RelativeItem().Column(c => { c.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten1); c.Item().PaddingTop(2).Text("Witness Signature").FontSize(8).FontColor(Colors.Grey.Darken1); });
            });
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
            if (!string.IsNullOrWhiteSpace(s.OperationNotes)) SectionTextOrImage(column.Item(), "Operation Notes", s.OperationNotes!);

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

            if (bundle.NursingNotes.Count > 0)
            {
                column.Item().PaddingTop(8).Text("Nursing Notes").SemiBold();
                foreach (var n in bundle.NursingNotes)
                {
                    column.Item().PaddingLeft(10).PaddingTop(2).Text($"{n.RecordedAt:hh:mm tt} ({n.RecordedByName})").FontSize(9).Italic();
                    if (IsHandwritingCapture(n.NoteText))
                    {
                        var base64 = n.NoteText[(n.NoteText.IndexOf(',') + 1)..];
                        column.Item().PaddingLeft(10).Height(60).Image(Convert.FromBase64String(base64)).FitArea();
                    }
                    else
                    {
                        column.Item().PaddingLeft(10).Text(n.NoteText).FontSize(9);
                    }
                }
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
                LabeledTextOrImage(column, "HPI", d.HistoryOfPresentIllness);
                LabeledTextOrImage(column, "Examination", d.ExaminationFindings);
                LabeledTextOrImage(column, "Diagnosis", d.ProvisionalDiagnosis);
                LabeledTextOrImage(column, "Treatment", d.TreatmentGiven);
                LabeledTextOrImage(column, "Remarks", d.Remarks);
                column.Item().PaddingLeft(10).Text($"Disposition: {d.Disposition}").FontSize(9).SemiBold();
            }
        });
    }

    /// <summary> Any of the ER Doctor Assessment's free-text fields may be a stylus capture (see
    /// HandwritingField) instead of typed text - renders the image when it is, an inline "Label: value" line
    /// otherwise, and nothing at all when the field wasn't filled in. </summary>
    private static void LabeledTextOrImage(ColumnDescriptor column, string label, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        if (IsHandwritingCapture(value))
        {
            column.Item().PaddingLeft(10).PaddingTop(2).Text($"{label}:").FontSize(9);
            var base64 = value[(value.IndexOf(',') + 1)..];
            column.Item().PaddingLeft(10).Height(50).Image(Convert.FromBase64String(base64)).FitArea();
        }
        else
        {
            column.Item().PaddingLeft(10).Text($"{label}: {value}").FontSize(9);
        }
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

    // The app's own brand accent (matches the frontend's teal buttons/theme) so every generated document
    // reads as part of the same product, not a generic black-on-white printout.
    private const string BrandHex = "#0F766E";
    private const string BrandLightHex = "#E6F3F1";

    private static void SectionHeading(IContainer container, string title)
    {
        container.Background(Color.FromHex(BrandLightHex)).Padding(6).Text(title).FontSize(12).Bold().FontColor(Color.FromHex(BrandHex));
    }

    /// <summary> A boxed, quoted block for the actual legal/consent wording a patient reads and signs against. </summary>
    private static void LegalTextBlock(IContainer container, string text)
    {
        container.Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten5)
            .Padding(10).Text(text).FontSize(9.5f).LineHeight(1.35f).FontColor(Colors.Grey.Darken3);
    }

    /// <summary> Small colored pill for a consent's Accepted/Refused decision, so it reads at a glance. </summary>
    private static void DecisionChip(IContainer container, string decision)
    {
        var color = decision == "Refused" ? Colors.Red.Medium : decision == "Fatal" ? Colors.Red.Darken2 : Colors.Green.Medium;
        container.Background(color).PaddingVertical(5).PaddingHorizontal(8).AlignCenter().Text(decision).FontColor(Colors.White).Bold().FontSize(10);
    }

    /// <summary> Shared A4 letterhead + footer wrapper so every document looks like it belongs to the same hospital. </summary>
    private static byte[] BuildDocument(string title, string subjectName, Action<ColumnDescriptor> body)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(0);
                page.DefaultTextStyle(x => x.FontSize(10.5f).FontColor(Colors.Grey.Darken3));

                page.Header().Column(column =>
                {
                    column.Item().Background(Color.FromHex(BrandHex)).Padding(20).Row(row =>
                    {
                        row.RelativeItem().Column(inner =>
                        {
                            inner.Item().Text(HospitalName).FontSize(20).Bold().FontColor(Colors.White);
                            inner.Item().PaddingTop(1).Text("Hospital Management System").FontSize(8.5f).FontColor(Colors.White);
                        });
                        row.ConstantItem(220).AlignRight().Text(title).FontSize(14).Bold().FontColor(Colors.White);
                    });
                    column.Item().Background(Color.FromHex(BrandLightHex)).Padding(10)
                        .Text($"Patient / Subject: {subjectName}").FontSize(11).Bold().FontColor(Color.FromHex(BrandHex));
                });

                page.Content().PaddingHorizontal(30).PaddingVertical(16).Column(body);

                page.Footer().PaddingHorizontal(30).PaddingBottom(12).Column(column =>
                {
                    column.Item().LineHorizontal(0.75f).LineColor(Colors.Grey.Lighten2);
                    column.Item().PaddingTop(4).Row(row =>
                    {
                        row.RelativeItem().Text($"Generated {DateTime.Now:dd MMM yyyy, hh:mm tt} · System-generated document.").FontSize(7.5f).Italic().FontColor(Colors.Grey.Darken1);
                        row.RelativeItem().AlignRight().Text(text =>
                        {
                            text.CurrentPageNumber().FontSize(8);
                            text.Span(" / ").FontSize(8);
                            text.TotalPages().FontSize(8);
                        });
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

    /// <summary> A clinical text field's value doubles as a stylus capture when it holds a base64 PNG data
    /// URI - mirrors frontend/src/components/clinical/HandwritingField.tsx's isHandwritingCapture, since the
    /// same string round-trips from there through the database into this PDF. </summary>
    private static bool IsHandwritingCapture(string? value) => !string.IsNullOrEmpty(value) && value.StartsWith("data:image", StringComparison.Ordinal);

    /// <summary> Same layout as LabeledRow, but renders an actual signature image instead of dumping the raw
    /// base64 data URI as text when the field holds a stylus capture. </summary>
    private static void LabeledSignatureRow(IContainer container, string label, string value)
    {
        container.PaddingBottom(3).Row(row =>
        {
            row.ConstantItem(150).Text(label).SemiBold();
            if (IsHandwritingCapture(value))
            {
                var base64 = value[(value.IndexOf(',') + 1)..];
                row.RelativeItem().Height(40).Image(Convert.FromBase64String(base64)).FitArea();
            }
            else
            {
                row.RelativeItem().Text(value);
            }
        });
    }

    private static void Section(IContainer container, string label, string value)
    {
        container.PaddingBottom(8).Column(column =>
        {
            column.Item().Text(label).SemiBold().FontColor(Color.FromHex(BrandHex));
            column.Item().Text(value);
        });
    }

    /// <summary> Same layout as Section, but renders an image instead of dumping a base64 data URI as text
    /// when the value is a stylus capture (e.g. Surgery.OperationNotes - see HandwritingField). </summary>
    private static void SectionTextOrImage(IContainer container, string label, string value)
    {
        container.PaddingBottom(8).Column(column =>
        {
            column.Item().Text(label).SemiBold().FontColor(Color.FromHex(BrandHex));
            if (IsHandwritingCapture(value))
            {
                var base64 = value[(value.IndexOf(',') + 1)..];
                column.Item().Height(70).Image(Convert.FromBase64String(base64)).FitArea();
            }
            else
            {
                column.Item().Text(value);
            }
        });
    }
}
