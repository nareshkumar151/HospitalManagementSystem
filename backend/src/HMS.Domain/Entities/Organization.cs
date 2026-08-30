using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Supports "Multi Hospital" scope (SRS Section 3). </summary>
public class Hospital : BaseEntity
{
    public string Name { get; set; } = default!;
    public string RegistrationNumber { get; set; } = default!;
    public string Address { get; set; } = default!;
    public string ContactNumber { get; set; } = default!;
    public string? Email { get; set; }
    public string? LogoUrl { get; set; }
}

/// <summary> Supports "Multi Branch" scope. </summary>
public class Branch : BaseEntity
{
    public int HospitalId { get; set; }
    public string Name { get; set; } = default!;
    public string Address { get; set; } = default!;
    public string City { get; set; } = default!;
    public string ContactNumber { get; set; } = default!;
    public bool IsActive { get; set; } = true;
}

/// <summary> Module 18: Department Management. </summary>
public class Department : BaseEntity
{
    public int BranchId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}
