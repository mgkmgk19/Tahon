import fs from 'node:fs';
import path from 'node:path';

console.log('--- Configuring Android Permissions and Runtime Settings ---');

// 1. Locate and update AndroidManifest.xml
const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');

if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');

  // List of permissions and features required
  const permissions = [
    '    <uses-permission android:name="android.permission.RECORD_AUDIO" />',
    '    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
    '    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />',
    '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '    <uses-permission android:name="android.permission.INTERNET" />',
    '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
    '    <uses-feature android:name="android.hardware.microphone" android:required="false" />',
  ];

  for (const perm of permissions) {
    const match = perm.match(/android:name="([^"]+)"/);
    if (match && !manifest.includes(match[1])) {
      manifest = manifest.replace('</manifest>', `${perm}\n</manifest>`);
      console.log(`[Permission Added] ${match[1]}`);
    }
  }

  // Ensure speech recognition service package query is present (required for Android 11+ / API 30+)
  if (!manifest.includes('android.speech.RecognitionService')) {
    const queriesBlock = `
    <queries>
        <intent>
            <action android:name="android.speech.RecognitionService" />
        </intent>
    </queries>`;
    manifest = manifest.replace('</manifest>', `${queriesBlock}\n</manifest>`);
    console.log('[Queries Added] android.speech.RecognitionService for Web Speech API visibility');
  }

  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('Successfully updated AndroidManifest.xml with microphone and storage permissions.');
} else {
  console.warn('Warning: AndroidManifest.xml not found at:', manifestPath);
}

// 2. Locate and configure MainActivity.java to automatically request runtime permission on launch
function findFile(dir, targetFileName) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const found = findFile(fullPath, targetFileName);
      if (found) return found;
    } else if (entry === targetFileName) {
      return fullPath;
    }
  }
  return null;
}

const mainActivityPath = findFile('android/app/src/main/java', 'MainActivity.java');
if (mainActivityPath) {
  console.log('Found MainActivity at:', mainActivityPath);

  const mainActivityCode = `package com.mill.management.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_MIC = 101;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Prompt the user for microphone permissions upon launch so it is never blocked
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                },
                PERMISSION_REQ_MIC
            );
        }
    }
}
`;

  fs.writeFileSync(mainActivityPath, mainActivityCode, 'utf8');
  console.log('Successfully updated MainActivity.java to request microphone permissions on launch!');
} else {
  console.warn('Warning: MainActivity.java not found in android/app/src/main/java');
}

console.log('--- Android Configuration Complete ---');
