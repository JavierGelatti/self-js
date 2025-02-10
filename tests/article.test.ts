import {describe, it, expect} from "vitest";
import {article} from "../src/article.ts";

describe("indefinite article for english nouns", () => {
    it("is the empty string when given an empty string", () => {
        expect(article("")).toBe("");
    });

    describe("regular behavior", () => {
        it('is "an" for words starting with a vowel (when no special cases apply)', () => {
            expect(article("apple")).toBe("an");
            expect(article("elephant")).toBe("an");
            expect(article("ice")).toBe("an");
        });

        it('is "a" for words starting with a consonant (when no special cases apply)', () => {
            expect(article("banana")).toBe("a");
            expect(article("cat")).toBe("a");
            expect(article("dog")).toBe("a");
        });
    });

    describe('for words starting with "f"', () => {
        it('is "an" for a single letter "F"', () => {
            expect(article("F")).toBe("an");
        });

        it('is "an" for a single letter "f"', () => {
            expect(article("f")).toBe("an");
        });

        it('is "a" for words like "Fox" where the second letter is in "aeiloru"', () => {
            expect(article("Fox")).toBe("a");
        });

        it('is "an" for words like "fy" where the second letter is not in "aeiloru"', () => {
            expect(article("Fx")).toBe("an");
        });
    });

    describe('for words starting with "u"', () => {
        it('is "a" for a single letter "u"', () => {
            expect(article("u")).toBe("a");
        });

        it('is "a" when the second letter is in "cks"', () => {
            expect(article("ukelele")).toBe("a");
            expect(article("usualPhone")).toBe("a");
        });

        it('is "a" for words starting with "un" where the third letter is a vowel', () => {
            expect(article("unit")).toBe("a");
            expect(article("uneven")).toBe("a");
        });

        it('is "a" for "un"', () => {
            expect(article("un")).toBe("a");
        });

        it('is "an" when the word starts with "un" and the third letter is not a vowel', () => {
            expect(article("uncle")).toBe("an");
        });

        it('is "an" for words like "uber" where no special "u" conditions are met', () => {
            expect(article("uber")).toBe("an");
        });
    });

    describe('for words starting with "eu"', () => {
        it('is "a" for words like "europe" and "eulogy"', () => {
            expect(article("europe")).toBe("a");
            expect(article("eulogy")).toBe("a");
        });
    });

    describe("for single-letters", () => {
        it('is "an" for single-letter vowels (except for "u")', () => {
            expect(article("A")).toBe("an");
            expect(article("E")).toBe("an");
            expect(article("I")).toBe("an");
            expect(article("O")).toBe("an");
            expect(article("a")).toBe("an");
        });

        it('is "a" for single-letter non-vowels non-F', () => {
            expect(article("B")).toBe("a");
            expect(article("U")).toBe("a");
        });

        it('is "an" for a single letter "F"', () => {
            expect(article("F")).toBe("an");
        });
    });
});
