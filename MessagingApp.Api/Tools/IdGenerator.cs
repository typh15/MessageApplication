using System;
using System.Security.Cryptography;

public static class IdGenerator
{
    // Custom Base32 alphabet: 26 letters + 6 numbers (omits confusing characters like 0, 1, 8, 9)
    private const string Base32Alphabet = "ABCDEFGHJKLMNOPQRSTUVWXYZ234567";

    public static string Get8CharId()
    {
        char[] result = new char[8];

        for (int i = 0; i < result.Length; i++)
        {
            int index = RandomNumberGenerator.GetInt32(Base32Alphabet.Length);
            result[i] = Base32Alphabet[index];
        }

        return new string(result);
    }
}