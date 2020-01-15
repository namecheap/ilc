const restoreScroll = () => {
    const y = history.state && history.state.scrollPosition || 0;
    window.scrollTo(0, y)
}

const saveScrollPosition = () => {
  history.replaceState({
    ...history.state,
    scrollPosition: pageYOffset || scrollY
  }, '')
}

const init = () => {
    history.scrollRestoration = 'manual';
}

export default {
  init,
  saveScrollPosition,
  restoreScroll,
}
