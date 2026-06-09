using System;
using System.Security.Cryptography;

public static class IdGenerator
{
    // Custom Base32 alphabet: 26 letters + 6 numbers (omits confusing characters like 0, 1, 8, 9)
    private const string Base32Alphabet = "ABCDEFGHJKLMNOPQRSTUVWXYZ234567";

    public static string Get8CharId()
    {
        // 1. Get raw 16 bytes from a new GUID
        byte[] guidBytes = Guid.NewGuid().ToByteArray();
        
        // 2. Hash it to distribute randomness evenly across all bytes
        byte[] hashBytes = SHA256.HashData(guidBytes);
        
        // 3. Extract 40 bits (5 bytes) from the hash to map exactly to 8 Base32 chars
        // Each Base32 character represents exactly 5 bits (8 chars * 5 bits = 40 bits)
        ulong bitBuffer = 0;
        for (int i = 0; i < 5; i++)
        {
            bitBuffer = (bitBuffer << 8) | hashBytes[i];
        }

        // 4. Decode the 40 bits into 8 alphanumeric characters
        char[] result = new char[8];
        for (int i = 7; i >= 0; i--)
        {
            int index = (int)(bitBuffer & 0x1F); // Get lowest 5 bits (0-31 index)
            result[i] = Base32Alphabet[index];
            bitBuffer >>= 5; // Shift right by 5 bits for the next character
        }

        return new string(result);
    }
}