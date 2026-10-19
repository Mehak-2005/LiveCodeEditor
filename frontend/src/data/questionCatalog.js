/**
 * Frontend Question Catalog Metadata
 * Used solely for displaying and searching problems in the Question Library.
 * 
 * Note: The AWS backend remains the source of truth for full problem descriptions,
 * starter code, function signatures, and test cases.
 */

export const questionCatalog = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Array & Hash Table",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    languages: ["Python", "Java"],
    status: "Available"
  },
  {
    id: "reverse-string",
    title: "Reverse String",
    difficulty: "Easy",
    category: "Two Pointers & String",
    description: "Write a function that reverses a string. The input string is given as an array of characters.",
    languages: ["Python", "Java"],
    status: "Available"
  },
  {
    id: "binary-search",
    title: "Binary Search",
    difficulty: "Medium",
    category: "Search & Array",
    description: "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums.",
    languages: ["Python", "Java"],
    status: "Available"
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stack & String",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    languages: ["Python", "Java"],
    status: "Available"
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
    category: "Array & Sorting",
    description: "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals into non-overlapping intervals.",
    languages: ["Python", "Java"],
    status: "Available"
  }
];

export function getCatalogQuestion(id) {
  return questionCatalog.find((q) => q.id === id) || null;
}
