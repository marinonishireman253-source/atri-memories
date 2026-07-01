import { AppOverlays } from './AppOverlays.jsx';
import { HomeStatusStack } from './HomeStatusStack.jsx';
import { useGalleryPageModel } from './useGalleryPageModel.js';
import { Gallery } from '../features/gallery/Gallery.jsx';

export function GalleryPageRoute(props) {
  const { galleryProps, statusProps, overlaysProps } = useGalleryPageModel(props);

  return (
    <>
      <Gallery {...galleryProps} />
      <HomeStatusStack {...statusProps} />
      <AppOverlays {...overlaysProps} />
    </>
  );
}
