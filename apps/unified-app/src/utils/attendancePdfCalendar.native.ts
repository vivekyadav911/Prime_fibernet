/** Native PDF uses expo-print HTML — calendar colors come from inline CSS. */
export async function renderCalendarHtmlToDataUrl(_calendarHtml: string): Promise<string> {
  throw new Error('renderCalendarHtmlToDataUrl is only used on web');
}
