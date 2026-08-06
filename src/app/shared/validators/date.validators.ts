export class DateValidators {
  /**
   * Validates a time in the format HHMM
   * @param originalHour The time to validate
   * @returns True if the time is valid, false otherwise
   */
  static validateHour(originalHour: string): boolean {
    if (!originalHour || originalHour === '') {
      return false;
    }

    const hour = originalHour.toString().replace(/[^0-9]/g, '');

    if (hour.length !== 4) {
      return false;
    }

    return true;
  }

  /**
   * Validates a time in the format HH:MM
   * @param originalHour The time to validate
   * @returns True if the time is valid, false otherwise
   */
  static validateHour24(originalHour: string): boolean {
    if (!originalHour || originalHour === '') {
      return false;
    }

    const match = originalHour.toString().match(/^(\d{2}):(\d{2})$/);
    if (!match || !match[1] || !match[2]) {
      return false;
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }
}
