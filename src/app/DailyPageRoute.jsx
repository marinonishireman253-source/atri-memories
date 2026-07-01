import { DailyAtri } from './DailyAtri.jsx';
import { useDailyPageModel } from './useDailyPageModel.js';

export function DailyPageRoute() {
  const { dailyAtriProps } = useDailyPageModel();

  return <DailyAtri {...dailyAtriProps} />;
}
