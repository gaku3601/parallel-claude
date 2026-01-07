import React from 'react';
import styles from './Layout.module.css';
import SidePanel from '../SidePanel/SidePanel';
import MainPanel from '../MainPanel/MainPanel';

const Layout: React.FC = () => {
  return (
    <div className={styles.layout}>
      <div className={styles.sidePanel}>
        <SidePanel />
      </div>
      <div className={styles.mainPanel}>
        <MainPanel />
      </div>
    </div>
  );
};

export default Layout;
