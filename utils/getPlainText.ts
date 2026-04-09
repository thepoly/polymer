// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPlainText = (title: any): string => {
  if (typeof title === 'string') return title;
  if (title && typeof title === 'object' && title.root) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extractText = (node: any): string => {
      if (node.type === 'text') return node.text || '';
      if (node.children && Array.isArray(node.children)) {
        return node.children.map(extractText).join('');
      }
      return '';
    };
    return extractText(title.root);
  }
  return '';
};
