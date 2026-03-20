import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import TwoColumns from './TwoColumns';

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-bg-main transition-colors duration-300">
            <Header />
            <TwoColumns columnOneContent={
                <>
                    <h2 className = {`text-4xl font-Raleway mb-4 capitalize text-accent`}>{"Main Contacts"}</h2>
                    <p style={{margin: '0 0 10px 0'}}>Email: <a href="mailto:poly@rpi.edu">poly@rpi.edu</a></p>
                    <p style={{margin: '0 0 10px 0'}}>Instagram: <a href="https://www.instagram.com/rpipoly/">https://www.instagram.com/rpipoly/</a></p>
                    <p style={{margin: '0 0 10px 0'}}>Twitter: <a href="https://x.com/RPIPoly">https://x.com/RPIPoly</a></p>
                    <p style={{margin: '0 0 30px 0'}}>Facebook: <a href="https://www.facebook.com/thepolytechnic">https://www.facebook.com/thepolytechnic</a></p>

                    <h2 className = {`text-4xl font-Raleway mb-4 capitalize text-accent`}>{"Mailing Address"}</h2>
                    <p style={{margin: '0 0 30px 0'}}> The Polytechnic<br/>c/o Rensselaer Union<br/>110 8th St.<br/>Troy, NY 12180 </p>

                    <h2 className = {`text-4xl font-Raleway mb-4 text-accent`}>{"Editorial and Article Submissions"}</h2>
                    <p>Please see <a href="https://poly.rpi.edu/submit/">our Submit page</a> for information on submitting letters to the editor or other articles.</p>
                </>
            }
            columnTwoContent={
                <>
                    <h2 className = {`text-4xl font-Raleway mb-4 capitalize text-accent`}>{"Department Contact"}</h2>
                    <p style={{margin: '0 0 10px 0'}}><b>General Correspondence</b>: editors@poly.rpi.edu</p>
                    <p style={{margin: '0 0 10px 0'}}><b>Leads</b>: leads@poly.rpi.edu</p>
                    <p style={{margin: '0 0 10px 0'}}><b>News Section</b>: news@poly.rpi.edu</p>
                    <p style={{margin: '0 0 10px 0'}}><b>Editorial/Opinion Section</b>: edop@poly.rpi.edu</p>
                    <p style={{margin: '0 0 10px 0'}}><b>Features Section</b>: features@poly.rpi.edu</p>
                    <p style={{margin: '0 0 10px 0'}}><b>Sports Section</b>: sports@poly.rpi.edu</p>
                    <p style={{margin: '0 0 10px 0'}}><b>Photo Department</b>: photo@poly.rpi.edu</p>
                    <p style={{margin: '0 0 30px 0'}}><b>Business Department</b>: business@poly.rpi.edu</p>
                </>
            }
            />
            <Footer />
        </div>
    );
};

export default App; 