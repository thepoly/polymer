import React from 'react';
import Header from '@/components/Header';

export default async function Contact() {
  return (<main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <div className="mx-auto max-w-[880px] px-4 pb-20 pt-8 md:px-6 md:pt-12">
        <div className="bg-bg-main transition-colors duration-300">
            <h1 className={`text-4xl font-serif mb-4 capitalize text-accent`}>
                {"Contact"}
            </h1>
            <div className="space-y-2.5 leading-8">
            <p>Email: <a href="mailto:poly@rpi.edu">poly@rpi.edu</a></p>
            <p>Instagram: <a href="https://www.instagram.com/rpipoly/">https://www.instagram.com/rpipoly/</a></p>
            <p>Twitter: <a href="https://x.com/RPIPoly">https://x.com/RPIPoly</a></p>
            <p>Facebook: <a href="https://www.facebook.com/thepolytechnic">https://www.facebook.com/thepolytechnic</a></p>
            </div>
            <h1 className = {`mt-10 text-4xl font-serif mb-4 capitalize text-accent`}>
                {"Department Contact"}
            </h1>
            <div className="space-y-2.5 leading-8">
            <p><b>General Correspondence</b> editors@poly.rpi.edu</p>
            <p><b>Leads</b> leads@poly.rpi.edu</p>
            <p><b>News Section</b> news@poly.rpi.edu</p>
            <p><b>Editorial/Opinion Section</b> edop@poly.rpi.edu</p>
            <p><b>Features Section</b> features@poly.rpi.edu</p>
            <p><b>Sports Section</b> sports@poly.rpi.edu</p>
            <p><b>Photo Department</b> photo@poly.rpi.edu</p>
            <p><b>Business Department</b> business@poly.rpi.edu</p>
            </div>
            <h1 className = {`mt-10 text-4xl font-serif mb-4 capitalize text-accent`}>
                {"Mailing Address"}
            </h1>
            <p className="mb-2.5 leading-8"> The Polytechnic<br/>c/o Rensselaer Union<br/>110 8th St.<br/>Troy, NY 12180 </p>
            <h1 className = {`mt-10 text-4xl font-serif mb-4 capitalize text-accent`}>
                {"Meetings"}
            </h1>
            <p className="leading-8"> 
                <i>The Poly</i> meets twice a week in RU 3510/3511:<br/>
            </p>
            <ul className="my-3 list-disc pl-6 leading-8">
                <li><b>Sunday, 1 pm:</b> Business and content meeting</li>
                <li><b>Monday, 6 pm:</b> Copy hour and Closing </li>
            </ul>
            <p className="mb-2.5 leading-8"> Everyone is welcome to attend. Times are subject to change. For finalized timings and virtual attendance options, please contact poly@rpi.edu.</p>
            <h1 className = {`mt-10 text-4xl font-serif mb-4 capitalize text-accent`}>
                    {"Editorial and Article Submissions"}
            </h1>
            <p className="leading-8">
                Please see <a href="https://poly.rpi.edu/submit/">our Submit page</a> for information on submitting letters to the editor or other articles.
            </p>
        </div>
      </div>
  </main>);
}
