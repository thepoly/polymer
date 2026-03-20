import React from 'react';
import './TwoColumnLayout.css'; // Import the CSS file

interface Props {
  columnOneContent: React.ReactNode;
  columnTwoContent: React.ReactNode;
}

const TwoColumns: React.FC<Props> = ({ columnOneContent, columnTwoContent }) => {
  return (
    <div className="two-columns-container">
      <div className="column">
        {columnOneContent}
      </div>
      <div className="column">
        {columnTwoContent}
      </div>
    </div>
  );
};

export default TwoColumns;