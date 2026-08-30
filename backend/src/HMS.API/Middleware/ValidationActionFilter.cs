using FluentValidation;
using HMS.Application.Common.Exceptions;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HMS.API.Middleware;

/// <summary>
/// Runs any registered FluentValidation validator (see HMS.Application.DependencyInjection) against every
/// action argument automatically, so controllers never call Validate(...) by hand. NFR: FluentValidation.
/// </summary>
public class ValidationActionFilter : IAsyncActionFilter
{
    private readonly IServiceProvider _serviceProvider;

    public ValidationActionFilter(IServiceProvider serviceProvider) => _serviceProvider = serviceProvider;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null) continue;

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (_serviceProvider.GetService(validatorType) is not IValidator validator) continue;

            var validationContext = new ValidationContext<object>(argument);
            var result = await validator.ValidateAsync(validationContext);
            if (!result.IsValid)
            {
                var errors = result.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                throw new ValidationAppException(errors);
            }
        }

        await next();
    }
}
