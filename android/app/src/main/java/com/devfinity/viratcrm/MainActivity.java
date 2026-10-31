package com.devfinity.viratcrm;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocationBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
