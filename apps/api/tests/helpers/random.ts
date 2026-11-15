export const randomPrice = (min = 1, max = 1000): number => {
  const minCents = Math.ceil(min * 100);
  const maxCents = Math.floor(max * 100);

  const cents =
    Math.floor(Math.random() * (maxCents - minCents + 1)) + minCents;

  return cents / 100;
};
