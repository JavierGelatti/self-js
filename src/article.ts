export function isVowel(c: string): c is 'a' | 'e' | 'i' | 'o' | 'u' {
    return "aeiou".includes(c.toLowerCase());
}

// Based on CharacterSequence>>#article from Cuis Smalltalk
export function article(noun: string): "" | "a" | "an" {
    if (noun.length === 0) return "";

    const first = noun.charAt(0).toLowerCase();
    const second = noun.charAt(1).toLowerCase();
    const third = noun.charAt(2).toLowerCase();

    const defaultArticle = isVowel(first) ? "an" : "a";

    if (first === "f" && !(second && "aeiloru".includes(second))) {
        return "an";
    }

    if (first === "u") {
        if ("cks".includes(second)) return "a";
        if (second === "n" && isVowel(third)) return "a";
    }

    if (first === "e" && second === "u") return "a";

    return defaultArticle;
}

export function withArticle(noun: string) {
    return `${article(noun)} ${noun}`;
}