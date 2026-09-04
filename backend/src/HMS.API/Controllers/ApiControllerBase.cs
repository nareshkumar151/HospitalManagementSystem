using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    protected int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected int? CurrentLinkedProfileId
    {
        get
        {
            var value = User.FindFirstValue("linkedProfileId");
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    protected int CurrentBranchId
    {
        get
        {
            var value = User.FindFirstValue("branchId");
            return int.TryParse(value, out var id) ? id : 1;
        }
    }

    /// <summary> Null when the caller has no real branchId claim - a genuinely anonymous (pre-login) request,
    /// or SuperAdmin, who isn't tied to a single hospital. Use this (never the client-supplied query param)
    /// to decide whether an [AllowAnonymous] listing endpoint should be branch-scoped: staff with a real
    /// claim are always forced to their own branch server-side; anonymous/SuperAdmin fall through to the
    /// unscoped, every-branch view. </summary>
    protected int? CurrentBranchIdOrNull
    {
        get
        {
            var value = User.FindFirstValue("branchId");
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    /// <summary> The caller's hospital, derived from their own JWT claim - defaults to 1 the same way
    /// <see cref="CurrentBranchId"/> does, for the same reason (every authenticated staff member below
    /// SuperAdmin always has a real claim; this only matters for code paths that shouldn't be reached
    /// without one). Patients are shared across every branch of one hospital (so the same patient can be
    /// treated at any branch without a duplicate record), so hospital-scoped list/lookup endpoints use
    /// this instead of <see cref="CurrentBranchId"/>. </summary>
    protected int CurrentHospitalId
    {
        get
        {
            var value = User.FindFirstValue("hospitalId");
            return int.TryParse(value, out var id) ? id : 1;
        }
    }

    /// <summary> Null for a genuinely anonymous request or SuperAdmin - see <see cref="CurrentBranchIdOrNull"/>. </summary>
    protected int? CurrentHospitalIdOrNull
    {
        get
        {
            var value = User.FindFirstValue("hospitalId");
            return int.TryParse(value, out var id) ? id : null;
        }
    }
}
