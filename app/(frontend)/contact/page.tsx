import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TwoColumns from './TwoColumns.tsx';

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-bg-main transition-colors duration-300">
            <Header />
            <TwoColumns columnOneContent={
                <>
                    <h2 className = {`text-4xl font-Raleway mb-4 capitalize text-accent`}>{"Main Contacts"}</h2>
                    <p className="leading-8">Email: <a href="mailto:poly@rpi.edu">poly@rpi.edu</a></p>
                    <p className="leading-8">Instagram: <a href="https://www.instagram.com/rpipoly/">https://www.instagram.com/rpipoly/</a></p>
                    <p className="leading-8">Twitter: <a href="https://x.com/RPIPoly">https://x.com/RPIPoly</a></p>
                    <p className="mb-5 leading-8">Facebook: <a href="https://www.facebook.com/thepolytechnic">https://www.facebook.com/thepolytechnic</a></p>

                    <h2 className = {`text-4xl font-Raleway mb-4 capitalize text-accent`}>{"Mailing Address"}</h2>
                    <p className="mb-5 leading-8"> The Polytechnic<br/>c/o Rensselaer Union<br/>110 8th St.<br/>Troy, NY 12180 </p>

                    <h2 className = {`text-4xl font-Raleway mb-4 text-accent`}>{"Editorial and Article Submissions"}</h2>
                    <p>Please see <a href="https://poly.rpi.edu/submit/">our Submit page</a> for information on submitting letters to the editor or other articles.</p>
                </>
            }
            columnTwoContent={
                <>
                    <h2 className = {`text-4xl font-Raleway mb-4 capitalize text-accent`}>{"Department Contact"}</h2>
                    <p className="leading-8"><b>General Correspondence</b>: editors@poly.rpi.edu</p>
                    <p className="leading-8"><b>Leads</b>: leads@poly.rpi.edu</p>
                    <p className="leading-8"><b>News Section</b>: news@poly.rpi.edu</p>
                    <p className="leading-8"><b>Editorial/Opinion Section</b>: edop@poly.rpi.edu</p>
                    <p className="leading-8"><b>Features Section</b>: features@poly.rpi.edu</p>
                    <p className="leading-8"><b>Sports Section</b>: sports@poly.rpi.edu</p>
                    <p className="leading-8"><b>Photo Department</b>: photo@poly.rpi.edu</p>
                    <p className="mb-5 leading-8"><b>Business Department</b>: business@poly.rpi.edu</p>
                </>
            }
            />
            <Footer />
        </div>
    );
};

export default App; 