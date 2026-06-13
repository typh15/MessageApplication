using Microsoft.AspNetCore.Mvc;

[ApiController]
public class UserAccountsController : ControllerBase
{
    private readonly IAccountServices AccountServices;

    public UserAccountsController(IAccountServices accountServices)
    {
        this.AccountServices = accountServices;
    }

}