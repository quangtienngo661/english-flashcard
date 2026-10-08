// Line-break tags used in messages (spec §4.4): <br/> always, <brMd/> from md up, <brSm/> below md only.
export const richBreaks = {
  br: () => <br />,
  brMd: () => <br className="hidden md:inline" />,
  brSm: () => <br className="md:hidden" />,
};
