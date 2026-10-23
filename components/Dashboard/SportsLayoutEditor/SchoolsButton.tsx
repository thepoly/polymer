'use client';

import { useEffect } from 'react';

// Schools is kept out of the admin sidebar (it rarely changes), so the Sports
// Layout list page gets a "Schools" button beside "Create New". Payload's list
// header has no slot there, so this places a link in it after mount, styled
// like the Create New button next to it.
export function SchoolsListButton() {
  useEffect(() => {
    const actions = document.querySelector('.list-header__title-actions');
    if (!actions) return;
    const createNew = actions.querySelector('a, button');
    const link = document.createElement('a');
    link.href = '/newsroom/collections/schools';
    link.textContent = 'Schools';
    if (createNew) link.className = createNew.className;
    actions.appendChild(link);
    return () => link.remove();
  }, []);

  return null;
}
