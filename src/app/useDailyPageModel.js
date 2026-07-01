import { useFeaturedMemories } from '../hooks/useFeaturedMemories.js';
import { dailyAtriModel } from './dailyAtriModel.js';

export function useDailyPageModel() {
  const { featuredMemories } = useFeaturedMemories();

  return {
    dailyAtriProps: {
      card: dailyAtriModel({
        memories: featuredMemories,
      }),
    },
  };
}
