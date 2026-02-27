import React from 'react';
import Header from '@/components/Header';

export default async function About() {
  return (<main className="min-h-screen bg-bg-main transition-colors duration-300">
      <Header />
      <div style={{ margin: '0 150px'}}>
        <div className="min-h-screen bg-bg-main transition-colors duration-300">
            <h1 className={`text-4xl font-serif mb-4 capitalize text-accent`}>
                {"About"}
            </h1>
            <p>
                <i>The Polytechnic</i> is the student-run news organization of Rensselaer Polytechnic Institute. 
                It is published online on a rolling basis, except during holiday and examination periods. 
                <i> The Polytechnic</i> ceased regular printing and switched to online-first distribution in 2018.
                Printed issues can be viewed at the Institute Archives &amp; Special Collections in the Folsom Library.
            </p>
            <p style={{margin: '10px 0 20px 0'}}>
                As of August 2019, our office is now located in RU 3510/3511, which is next to the elevator on the third floor of the Rensselaer Union. <br /> 
            </p>
            <h1 className = {`text-4xl font-serif mb-4 capitalize text-accent`}>
                    {"Meeting Times"}
            </h1>
            <p>
                We hold our weekly business and content meetings on Sundays at 1 pm EST in RU 3510/3511. Everyone is welcome to attend. 
                Meeting times are subject to change, so please contact poly@rpi.edu in advance if you plan on coming or would prefer to attend meetings online.
            </p>
        </div>
      </div>
  </main>);
}
