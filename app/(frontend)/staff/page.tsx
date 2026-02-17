import React from 'react';
import { getPayload } from 'payload';
import config from '@/payload.config';
import Image from 'next/image';
import Link from 'next/link';
import { Media } from '@/payload-types';

export const revalidate = 60;

export default async function StaffPage() {
  const payload = await getPayload({ config });

  const usersResponse = await payload.find({
    collection: 'users',
    limit: 100,
    sort: 'lastName',
    depth: 2,
  });

  const users = usersResponse.docs;

  return (
    <>
      {/* Staff Title */}
      <div className="mb-10 mt-5">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black">
          Staff
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-8">
        {users.map((user) => {
          const headshot = user.headshot as Media | null;
          
          const currentPosition = user.positions?.find(p => !p.endDate) || user.positions?.[0];
          const jobTitle = currentPosition?.jobTitle;
          let titleString = typeof jobTitle === 'object' && jobTitle ? jobTitle.title : '';

          if (!titleString && user.roles && user.roles.length > 0) {
            const roleMap: Record<string, string> = {
              admin: 'Admin',
              eic: 'Editor in Chief',
              editor: 'Editor',
              writer: 'Writer',
              'copy-editor': 'Copy Editor',
            };
            const sortedRoles = [...user.roles].sort((a, b) => {
              const priority = ['eic', 'admin', 'editor', 'copy-editor', 'writer'];
              return priority.indexOf(a) - priority.indexOf(b);
            });
            
            titleString = sortedRoles.map(r => roleMap[r] || r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
          }

          return (
            <Link 
              href={`/staff/${user.id}`} 
              key={user.id}
              className="group flex flex-col items-start text-left"
            >
              <div className="relative w-full aspect-[3/4] mb-3 bg-gray-100 overflow-hidden">
                {headshot?.url ? (
                  <Image
                    src={headshot.url}
                    alt={`${user.firstName} ${user.lastName}`}
                    fill
                    className="object-cover transition-opacity duration-300 hover:opacity-95"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                    <svg className="w-12 h-12 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
              
              <h3 className="text-[15px] md:text-[16px] leading-tight font-bold text-black mb-1 group-hover:underline decoration-1 underline-offset-2">
                {user.firstName} {user.lastName}
              </h3>
              
              {titleString && (
                <p className="text-[13px] md:text-[14px] leading-snug text-gray-600 font-light">
                  {titleString}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
