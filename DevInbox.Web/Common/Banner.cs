namespace DevInbox.Web.Common;

/// <summary>Prints a startup banner to the console, similar to Spring Boot's banner.txt.</summary>
internal static class Banner
{
    internal static void Print()
    {
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("""
          ____            ___      _
         |  _ \  _____   |_ _|_ __| |__   _____  __
         | | | |/ _ \ \ / /| || '_ \ '_ \ / _ \ \/ /
         | |_| |  __/\ V / | || | | | |_) | (_) >  <
         |____/ \___| \_/ |___|_| |_|_.__/ \___/_/\_\
        """);
        Console.ResetColor();

        var version = typeof(Banner).Assembly.GetName().Version!;
        Console.WriteLine($"  ASP.NET Core {Environment.Version}  |  Dev Inbox v{version.Major}.{version.Minor}.{version.Build}");
        Console.WriteLine();
    }
}
