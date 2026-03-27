import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default async function About() {
  return (<main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <div className="mx-auto max-w-[880px] px-4 pb-20 pt-8 md:px-6 md:pt-12">
        <div className="bg-bg-main transition-colors duration-300">
            <h1 className={`text-4xl font-serif mb-4 capitalize text-accent`}>
                {"About"}
            </h1>
            <p className="leading-8">
                <i>The Polytechnic</i> is the student-run news organization of Rensselaer Polytechnic Institute. 
                It is published online on a rolling basis, except during holiday and examination periods. 
                <i> The Polytechnic</i> ceased regular printing and switched to online-first distribution in 2018.
                Printed issues can be viewed at the Institute Archives &amp; Special Collections in the Folsom Library.
            </p>
            <p className="my-5 leading-8">
                As of August 2019, our office is now located in RU 3510/3511, which is next to the elevator on the third floor of the Rensselaer Union. <br /> 
            </p>
            <h1 className = {`mt-10 text-4xl font-serif mb-4 capitalize text-accent`}>
                    {"Meeting Times"}
            </h1>
            <p className="leading-8">
                <i>The Poly</i> meets twice a week in RU 3510/3511 on Sunday at 1 pm, and on Monday at 6 pm. Everyone is welcome to attend. 
                Meeting times are subject to change, so please contact poly@rpi.edu in advance if you plan on coming or would prefer to attend meetings online.
            </p>
        </div>
      </div>
      <Footer />
    </main>);
}
