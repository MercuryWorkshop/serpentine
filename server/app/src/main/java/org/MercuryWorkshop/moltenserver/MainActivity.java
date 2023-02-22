package org.MercuryWorkshop.moltenserver;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.Permissions;
import java.util.Base64;
import java.util.Iterator;
import java.util.Scanner;

import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import org.json.*;

import javax.net.ssl.HttpsURLConnection;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.internal.http.HttpHeaders;
import okhttp3.internal.http2.Header;

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

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.MANAGE_EXTERNAL_STORAGE)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.MANAGE_EXTERNAL_STORAGE},
                    1);
            Log.e("MoltenServer","jsakd");

        }else{
            Log.e("MoltenServer","ASDJKASDL");
        }
//        Thread thread = new Thread(new Runnable() {
//
//            OkHttpClient client = new OkHttpClient();
//            URL url = null;
//            @Override
//            public void run() {
//                try {
//                    url = new URL("https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png");
//                } catch (
//                        MalformedURLException e) {
//                    throw new RuntimeException(e);
//                }
//
//                Request req = new Request.Builder().url(url).build();
//                try (
//                        Response httpResp = client.newCall(req).execute()) {
//
//
//                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
//                        byte[] b = httpResp.body().source().readByteArray();
////                        byte[] body = httpResp.body().bytes();
////                        body.toString();
////                        String read = httpResp.body().source().readUtf8();
////
////                        ByteArrayOutputStream bOut = new ByteArrayOutputStream();
////
////                        BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(new FileOutputStream("/storage/emulated/0/Documents/fuck.png"), "utf8"));
////
////                        bw.write(Base64.getMimeEncoder().encodeToString(b));
//                        bw.close();
//                    }
//                } catch (
//                        IOException e) {
//                    throw new RuntimeException(e);
//                }
//            }
//        });
//        thread.start();
        startServerSocket();
    }
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 1) {
            if (grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d("MoltenServer","thranted??/");
                // Permission granted, do your work
            } else {
                Log.d("MoltenServer","asdjaskldjklas");
//                Log.d("MoltenServer",permissions);
            }
        }
    }

    private void listenToClient(Socket sock) {
        Thread thread = new Thread(new Runnable() {
            private boolean end = false;
            private String stringData = null;
            OkHttpClient client = new OkHttpClient().newBuilder()
                    .followRedirects(false)
                    .followSslRedirects(false)
                    .build();

            @Override
            public void run() {
                try {


                    BufferedReader input = new BufferedReader(new InputStreamReader(sock.getInputStream()));
                    PrintWriter output = new PrintWriter(sock.getOutputStream());
                    while (!end) {
//                        output.println("CONNECTION");
                        stringData = input.readLine();
                        if (stringData == null) {
                            end = true;
                            return;
                        }
                        try {
                            JSONObject request = new JSONObject(stringData);
                            JSONObject reqHeaders = request.getJSONObject("headers");
                            URL url = new URL(request.getString("url"));
                            Request.Builder builder = new Request.Builder().url(url);


                            if (!request.getString("method").equalsIgnoreCase("get")) {
                                Log.d("MoltenServer",request.getString("method"));
                                builder.method(request.getString("method"), RequestBody.create(MediaType.parse(reqHeaders.getString("Content-Type")), request.getString("body")));
                            }
                            for (Iterator<String> it = reqHeaders.keys(); it.hasNext(); ) {
                                String key = it.next();
                                if (!key.equals("Authorization")) {
                                    builder.header(key, reqHeaders.getString(key));
                                }
                            }


                            Request httpreq = builder.build();
                            try (Response httpResp = client.newCall(httpreq).execute()) {


                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    byte[] body = httpResp.body().source().readByteArray();

                                    JSONObject resp = new JSONObject();
                                    resp.put("id", request.getString("id"));
                                    resp.put("data", Base64.getMimeEncoder().encodeToString(body));


                                    JSONObject headers = new JSONObject();

                                    for (Iterator<String> it = httpResp.headers().toMultimap().keySet().iterator(); it.hasNext(); ) {
                                        String key = it.next();
                                        headers.put(key,httpResp.header(key));
                                    }
                                    resp.put("status",httpResp.code());
                                    resp.put("headers",headers);
                                    output.println(resp.toString() + "\004");

                                }
                            }
                        }catch (Exception e){
                            Log.d("MoltenServer",e.toString());
                        }

                        Log.e("MoltenServer",stringData += ":EOL");
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