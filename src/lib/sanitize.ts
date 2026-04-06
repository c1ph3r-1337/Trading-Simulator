/** HTML 태그 제거 및 길이 제한 */
export function sanitizeText(input: string, maxLength: number): string {
    return input
        .replace(/<[^>]*>/g, "") // HTML 태그 제거
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim()
        .slice(0, maxLength);
}
