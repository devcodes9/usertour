import { ThemeListSkeleton } from '@/components/molecules/skeleton';
import { useThemeListContext } from '@/contexts/theme-list-context';
import { Theme } from '@usertour-ui/types';
import { ThemeListPreview } from './theme-list-preview';

export const ThemeListContent = () => {
  const { themeList, loading } = useThemeListContext();
  if (loading) {
    return <ThemeListSkeleton count={9} />;
  }
  return (
    // <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-6 gap-4 min-w-80 "></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 min-w-80">
      {!loading &&
        themeList &&
        themeList.map((theme: Theme) => <ThemeListPreview theme={theme} key={theme.id} />)}
    </div>
  );
};

ThemeListContent.displayName = 'ThemeListContent';
