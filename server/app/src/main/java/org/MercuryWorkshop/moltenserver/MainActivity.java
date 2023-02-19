package org.MercuryWorkshop.moltenserver;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import org.json.*;

import javax.net.ssl.HttpsURLConnection;

public class MainActivity extends AppCompatActivity {

    private Button buttonStartReceiving;
    private Button buttonStopReceiving;
    private TextView textViewDataFromClient;
    final Handler handler = new Handler();
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        textViewDataFromClient = (TextView) findViewById(R.id.textViewDataFromClient);

        startServerSocket();
    }

    private void listenToClient(Socket sock) {
        Thread thread = new Thread(new Runnable() {
            private boolean end = false;
            private String stringData = null;

            @Override
            public void run() {
                try {

                    BufferedReader input = new BufferedReader(new InputStreamReader(sock.getInputStream()));
                    PrintWriter output = new PrintWriter(sock.getOutputStream());
                    while (!end) {
//                        output.println("CONNECTION");
                        stringData = input.readLine();
                        if (stringData == null) end = true;
                        JSONObject obj = new JSONObject(stringData);
                        URL url = new URL(obj.getString("url"));
                        HttpsURLConnection urlConnection = (HttpsURLConnection) url.openConnection();
                        try {
                            InputStream in = new BufferedInputStream(urlConnection.getInputStream());

                            Scanner s = new Scanner(in).useDelimiter("\\A");
                            String result = s.hasNext() ? s.next() : "";

                            output.println(result);
                        } finally {
                            urlConnection.disconnect();
                        }

                        Log.d("MoltenServer",stringData += ":EOL");
                        output.flush();
//                        android.os.Process.killProcess(android.os.Process.myPid());


//                        try {
//                            Thread.sleep(1000);
//                        } catch (InterruptedException e) {
//                            e.printStackTrace();
//                        }

                        //output.
                        updateUI(stringData);
                        if (stringData.equalsIgnoreCase("STOP")) {
                            end = true;
                            output.close();
                            try {
                                sock.close();
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                            break;
                        }

                    }
                    output.close();
                    sock.close();
                }catch (IOException e){
                    throw new RuntimeException(e);
                } catch (JSONException e) {
                    throw new RuntimeException(e);
                }
            }
        });
        thread.start();

    }
    private void startServerSocket() {

        Thread thread = new Thread(new Runnable() {

            private String stringData = null;

            @Override
            public void run() {

                try {

                    ServerSocket ss = new ServerSocket(1234);

                    while (true) {
                        //Server is waiting for client here, if needed
                        Socket s = ss.accept();
                        listenToClient(s);
                    }
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }

        });
        thread.start();
    }

    private void updateUI(final String stringData) {

        handler.post(new Runnable() {
            @Override
            public void run() {

                String s = textViewDataFromClient.getText().toString();
                if (stringData.trim().length() != 0)
                    textViewDataFromClient.setText(s + "\n" + "From Client : " + stringData);
            }
        });
    }
}