import atriInspiredBackground from '../assets/atri-inspired-bg.webp';
import atriMemoryHarborBackground from '../assets/atri-memory-harbor-bg.webp';
import atriSubmergedCity from '../assets/atri-submerged-city.webp';
import atriSunsetDock from '../assets/atri-sunset-dock.webp';
import atriGreenhouse from '../assets/atri-greenhouse.webp';

export const backgroundPresets = [
  {
    id: 'atri-submerged-city',
    name: '沉没都市',
    description: '阳光下的海底近未来遗迹',
    url: atriSubmergedCity,
    placeholder: "data:image/webp;base64,UklGRlgAAABXRUJQVlA4IEwAAADwAQCdASoQABAABUB8JbACdADwoL6Y1MAA/ghnPYp8uWbWpG1RdDb9BzJ83OYHVeUmIGoKXBuje0l7mElXSFBhrtqWHsAgbmKmFyAA",
  },
  {
    id: 'atri-sunset-dock',
    name: '落日船坞',
    description: '红霞微波与废旧港口',
    url: atriSunsetDock,
    placeholder: "data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAABQAgCdASoQABAABUB8JbACdADpJ24ZO6vLywAA99QmeBLuwHJP1zwf9jaKjSpY6fp/X6X4NNwV50F0t5bo/Yz6JeJ4jcinb/icvWfQU8aL4a2upkzyiQAA",
  },
  {
    id: 'atri-greenhouse',
    name: '废弃温室',
    description: '齿轮管道与盛开的向日葵',
    url: atriGreenhouse,
    placeholder: "data:image/webp;base64,UklGRmAAAABXRUJQVlA4IFQAAADwAQCdASoQABAABUB8JagC7AC6F9leKAAA4n22f+dQz7NingIhMOzx+Ubupa6CO5nQmZnutp5qbmbj0yFRFpdlmsHBY2Kk4WyN/L06pygM1ckAAAA=",
  },
  {
    id: 'atri-summer',
    name: '亚托莉夏海',
    description: '蓝白夏日海面',
    url: atriMemoryHarborBackground,
    placeholder: "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoQABAABUB8JbACdAEVlRff5oAA/luK5YXVfOuhGYwtYnmPgoHMhA8RQm72N9WgA3ZfbLkIjQAAAA==",
  },
  {
    id: 'atri-classic',
    name: '旧日夏海',
    description: '原始蓝白夏日海面',
    url: atriInspiredBackground,
    placeholder: "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADwAQCdASoQABAABUB8JbACdADNFsjwBOAA/soaZoGu7OhPfM5txJOzFfPmlHkmg0ra+zFkHh0H6olznLlf6Qw8LtrdI6ghOjhkVL+sAAA=",
  },
  {
    id: 'quiet-sea',
    name: '海静天晴',
    description: '蓝色潮汐与清澈光线',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=2400&q=82',
    placeholder: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='100%' height='100%' fill='%23508eb6'/></svg>",
  },
  {
    id: 'sunset',
    name: '夕阳海岸',
    description: '温暖的海风与落日',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=82',
    placeholder: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='100%' height='100%' fill='%23df7a5c'/></svg>",
  },
  {
    id: 'deep-blue',
    name: '深海幽蓝',
    description: '沉静的深蓝呼吸',
    url: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&w=2400&q=82',
    placeholder: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='100%' height='100%' fill='%2310243d'/></svg>",
  },
  {
    id: 'after-rain',
    name: '雨后晨光',
    description: '云隙中的绿色微光',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2400&q=82',
    placeholder: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='100%' height='100%' fill='%236e8b7c'/></svg>",
  },
];

export const defaultBackground = backgroundPresets[0].url;
