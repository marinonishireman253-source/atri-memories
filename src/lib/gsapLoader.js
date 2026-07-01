let gsapCache = null;
let scrollTriggerCache = null;

export async function loadGsap() {
  if (gsapCache && scrollTriggerCache) {
    return { gsap: gsapCache, ScrollTrigger: scrollTriggerCache };
  }
  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  gsapCache = gsap;
  scrollTriggerCache = ScrollTrigger;
  return { gsap, ScrollTrigger };
}
